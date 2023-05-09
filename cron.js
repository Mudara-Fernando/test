
var fs = require('fs');
var crypto = require('crypto');
var moment = require('moment-timezone');
var servicesCache = {};
const log4js = require('log4js');

log4js.configure({
    appenders: { cron_log: { type: 'file', filename: 'logs/viwo-dashboard.log', level:'debug' }},
    categories: { default: { appenders: ['cron_log'], level: 'info' } }
});

const logger = log4js.getLogger('cron_log');
var G_APPS_MONTHLY_ANNUAL = 'G Suite Basic Annual Billed Monthly';
var G_APPS_UMLIMITTED_MONTHLY_ANNUAL = 'G Suite Business Annual Billed Monthly';
var G_ENTERPISE_MONTHLY_ANNUAL = 'G Suite Enterprise Annual Billed Monthly';

var G_APPS_ANNUAL = 'G Suite Basic Annual';
var G_APPS_UMLIMITTED_ANNUAL = 'G Suite Business Annual';
var G_ENTERPISE_ANNUAL = 'G Suite Enterprise Annual';

var G_APPS_FLEXIBLEL = 'G Suite Basic Flexible';
var G_APPS_UMLIMITTED_FLEXIBLE = 'G Suite Business Flexible';
var G_ENTERPISE_FLEXIBLE = 'G Suite Enterprise Flexible';
//G Suite Basic Flexible,G Suite Business Flexible, G Suite Enterprise Flexible
//G Suite Basic Annual, G Suite Business Annual, G Suite Enterprise Annual

var cron = module.exports = {
	connection: null,
	processDate: null,
	processTime: null,
	fromIndex : null,
	toIndex : null,
	cron_id: null,
	zoho_api_request_max: 2300, // Actual allowed is 2500 requests. Keeping 200 buffer for unexpected additional requests

	// public
	processZohoCRM: function(connection, fromIndex, toIndex, config, processDate, processTime, callback){
		logger.debug("Processing the zoho crm request from index " + fromIndex + "to " + toIndex);
		console.log("getting zoho crm");
		cron.connection = connection;
		cron.processDate = processDate;
		cron.processTime = processTime;
		cron.toIndex = toIndex;
		cron.fromIndex = fromIndex;
		var http = require('https');

		// CRM API Request URL
        var crm_options = {
            host: 'crm.zoho.com', port: 443, method: 'GET',
            path: '/crm/private/json/Accounts/getRecords'+
            '?scope=crmapi'+
            // '&lastModifiedTime='+processDate+'%20'+processTime+
            '&fromIndex='+ fromIndex +
            '&toIndex='+ toIndex +
            '&authtoken='+config.zoho.authtoken
        };
		logger.debug("crm response come");
		var crm_get = http.request(crm_options,
			function(response){
				response.setEncoding('utf8');
				var completeResponse = '';
				response.on('data', function (chunk){
					//	Buffer the receive data
					completeResponse += chunk;
				});
				response.on('end', function (chunk){
					cron.connection.query(
						'UPDATE http_requests SET request_count = request_count + 1 WHERE cron_id = ? AND api_source = ?', [cron.cron_id, 'zoho_crm'],
						function(err, rows, fields){
							completeResponse = JSON.parse(completeResponse);
							var data = [];
							//	Check if we have a positive response
							if (typeof completeResponse.response != 'undefined' && typeof completeResponse.response.result != 'undefined'){
								completeResponse = completeResponse.response.result.Accounts.row;
								//	Build Zoho garbage data in to a proper usable data set
								if (completeResponse instanceof Array) {
									for (var i = 0; i < completeResponse.length; i++)
										//if (typeof completeResponse[i].FL != 'undefined')
										data.push(cron.parseZohoRecord(completeResponse[i].FL));
								} else {
									//if (typeof completeResponse.FL != 'undefined')
									data.push(cron.parseZohoRecord(completeResponse.FL));
								}
								//
								//	-------------------------------------------------------------------------------
								//	Ok, now we can go ahead and process Accounts update
								var progress = 0;
								cron.zohoLeadSourceCache = {};
								for (var i = 0; i < data.length; i++){
									cron.getZohoAccount(data[i], function(account_id){
										progress += 1;
										if (progress == data.length){
											callback(progress);
											//	Release memory to GC
											cron.zohoLeadSourceCache = {};
										}
									});
								}

                                if (data.length % 200 == 0) {
                                    cron.processZohoCRM(connection, cron.toIndex, cron.toIndex + 200, config, processDate, processTime, callback)
                                }
							} else {
								logger.debug(completeResponse);
								callback(true);
							}
						}
					);
				});
			})
			.on('error', function(err){
                logger.error(err);
			});
		crm_get.end();
	},

	processZohoBooks: function(connection, config, processDate, processTime, page, callback){
		logger.debug("Sending requests to zoho books");
		cron.connection = connection;
		cron.processDate = processDate;
		cron.processTime = processTime;
		var http = require('https');

		// Books API Request URL
		var books_options = {
			hostname: 'books.zoho.com', port: 443, method: 'GET',
			path: '/api/v3/invoices'+
			'?authtoken='+config.zoho_books.auth_token+
			'&organization_id='+config.zoho_books.organization_id+
			'&sort_column=last_modified_time'+
			// '&sort_order=A'+ // Oldest first. Defaults to "newest first" if not specified
			// '&last_modified_time='+processDate+'T'+processTime+'-0700'+
			'&page='+page
		};
		// Get accounts update from Zoho
		var books_get = http.request(books_options, function(response){
			response.setEncoding('utf8');
			var completeResponse = '';
			response.on('data', function (chunk){
				//	Buffer the receive data
				completeResponse += chunk;
			});
			response.on('end', function (chunk){
				cron.connection.query(
					'UPDATE http_requests SET request_count = request_count + 1 WHERE cron_id = ? AND api_source = ?', [cron.cron_id, 'zoho_books'],
					function(err, rows, fields){
						completeResponse = JSON.parse(completeResponse);
						//	Check if we have a positive response
						if (typeof completeResponse.invoices != 'undefined') {
							var progress = 0;
							for (var i = 0; i < completeResponse.invoices.length; i++){
								cron.getZohoInvoices(completeResponse.invoices[i], function(invoice_id){
									progress++;
								});
							}

							cron.connection.query('SELECT SUM(request_count) as request_count FROM http_requests WHERE cron_start_time > (now() - INTERVAL 1 DAY) AND api_source = "zoho_books"', function(err, rows, fields){
								if (typeof rows != 'undefined'){
                                    if(rows[0].request_count < cron.zoho_api_request_max) {
                                        if(completeResponse.page_context.has_more_page){
                                            setTimeout(function () {
                                                cron.processZohoBooks(connection, config, processDate, processTime, completeResponse.page_context.page+1, callback);
                                            }, 30*1000); // delay 30 seconds between each call, to avoid hitting per minute quota
                                        } else {
                                            callback(progress, true);
                                        }
                                    } else {
                                        // todo: send mail to inform api limit maxed out
                                        callback(progress, true);
                                    }
								}
							});
						} else {
							logger.debug(completeResponse);
						}
					}
				);
			});
		})
			.on('error', function(err){
				logger.error("Error occured on sending the requests to the zoho books " + err);
			});
		books_get.end();
		callback(200, false);
	},

    processZohoSubscription: function(connection, config, processDate, processTime, page){
        logger.debug("Sending requests to zoho subscriptions");
        cron.connection = connection;
        cron.processDate = processDate;
        cron.processTime = processTime;
        var http = require('https');
		var zohoSubscriptions;
        // Books API Request URL
        var books_options = {
            hostname: 'subscriptions.zoho.com', port: 443, method: 'GET',
            path: '/api/v1/subscriptions'+
            '?authtoken='+config.zoho_subscriptions.auth_token+
            '&organization_id='+config.zoho_subscriptions.organization_id+
            '&filter_by=SubscriptionStatus.ACTIVE&page='+page
            // '&sort_order=A'+ // Oldest first. Defaults to "newest first" if not specified
            // '&last_modified_time='+processDate+'T'+processTime+'-0700'+
        };
        // Get accounts update from Zoho
        var books_get = http.request(books_options, function(response){
            response.setEncoding('utf8');
            var completeResponse = '';
            response.on('data', function (chunk){
                //	Buffer the receive data
                completeResponse += chunk;

            });
            response.on('end', function (chunk){
            	console.log("got the complete response for zoho subscriptions");
                        completeResponse = JSON.parse(completeResponse);
                        if (typeof completeResponse.subscriptions != 'undefined') {
                            var progress = 0;
                            for (var i = 0; i < completeResponse.subscriptions.length; i++){
                               new cron.updateViwoPlan(completeResponse.subscriptions[i]);
                            }
                        } else {
                            logger.debug(completeResponse);
                        }

						if(completeResponse.page_context.has_more_page){
							setTimeout(function () {
								cron.processZohoSubscription(connection, config, processDate, processTime, completeResponse.page_context.page+1);
							}, 20*1000); // delay 30 seconds between each call, to avoid hitting per minute quota
						} else {
							// callback(progress, true);
						}
            });
        })
            .on('error', function(err){
                logger.error("Error occured on sending the requests to the zoho books " + err);
            });
        books_get.end();
    },

    updateCancelSubscription: function(connection, config, processDate, processTime){
        logger.debug("Update Cancel subscriptions");
        cron.connection = connection;
        cron.processDate = processDate;
        cron.processTime = processTime;
        cron.connection.query('SELECT id FROM subscription WHERE cron_date < DATE_SUB( ? , INTERVAL 3 DAY) AND  entry_exist = ? ;',
            [cron.processDate, 1],
            function (err, rows, fields) {

                if (!err && rows.length > 0){
                    var eventIdList = [];
                    for (var entry in rows){
                        eventIdList.push(rows[entry]['id']);
                        cron.connection.query(
                            'SELECT MAX(id) FROM subscription_event WHERE subscr_id = ' + rows[entry]['id'],
                            function(err, rows, fields){
                            	if (err || rows.length == 0){
                            		console.log(err)
									console.log("no subscription events found");
								} else {
                            		var event_id = rows[0]['MAX(id)'];
                                    cron.connection.query(
                                        'UPDATE subscription_event SET new_status = ? WHERE id = ? ',
                                        ['CANCELLED' , event_id],
                                        function(err, rows, fields){
                                            if (!err){
                                                logger.debug("Successfully change the status from active to cancel");
                                            } else {
                                                console.log(err)
                                                logger.debug("Error occured while changing the status from active to cancel " + err);
                                            }
                                        });
								}
                            });
                    }
                } else {
                	console.log(err);
                    logger.debug( err + "error occured while fetching the event id list to make the status as cancel ");
                }
            })

    },

	processZohoContact: function (contact_id, callback) {
		logger.debug("Sending the zoho contact requests");
		var http = require('https');
		// API Request URL
		var options = {
			hostname: 'books.zoho.com', port: 443, method: 'GET',
			path: '/api/v3/contacts/'+contact_id+
			'?authtoken=bc8cd6d58d46e551b829e6d32264e4fc'+
			'&organization_id=57907064'
		};

		// Get accounts update from Zoho
		var get = http.request(options, function(response){
			response.setEncoding('utf8');
			var completeResponse = '';
			response.on('data', function (chunk){
				//	Buffer the receive data
				completeResponse += chunk;
			});
			response.on('end', function (chunk){
				cron.connection.query(
					'UPDATE http_requests SET request_count = request_count + 1 WHERE cron_id = ? AND api_source = ?', [cron.cron_id, 'zoho_books'],
					function(err, rows, fields){
						completeResponse = JSON.parse(completeResponse);
						//	Check if we have a positive response
						if (typeof completeResponse.contact != 'undefined'){
							callback(completeResponse.contact);
						} else {
							logger.debug("Zoho contact response " + completeResponse);
						}
					}
				);
			});
		})
			.on('error', function(err){
				logger.error("Error occured on sending the request to the zoho contact" + err);
			});
		get.end();
	},

	parseZohoRecord: function(dat){
		var data = {};
		for (var i = 0; i < dat.length; i++)
			data[dat[i].val] = dat[i].content;
		return data;
	},

	getZohoAccount: function(data, callback){
		logger.debug("Updating the zoho accounts in local database");
		cron.getZohoUser(data.SMOWNERID, data['Account Owner']);
		cron.getZohoUser(data.SMCREATORID, data['Created By']);
		cron.getZohoLeadSource((typeof data['Lead Source'] == 'undefined' ? '' : data['Lead Source'].toString()),
			function(sourceId){
				var account = {
					id: data.ACCOUNTID,
					owner_id: data.SMOWNERID,
					name: (typeof data['Account Name'] != 'undefined' ? data['Account Name'] : null),
					domain: (typeof data.Website != 'undefined' ? data.Website : null),
					phone: (typeof data.Phone != 'undefined' ? data.Phone : null),
					email: (typeof data['Email Address'] != 'undefined' ? data['Email Address'] : null),
					type: (typeof data['Account Type'] != 'undefined' ? data['Account Type'] : null),
					industry: (typeof data.Industry != 'undefined' ? data.Industry : null),
				};

                var domain = {
                	creator_id: data.SMCREATORID,
                    name: (typeof data['Account Name'] != 'undefined' ? data['Account Name'] : null),
                    domain: (typeof data.Website != 'undefined' ? data.Website : null),
                    phone: (typeof data.Phone != 'undefined' ? data.Phone : null),
                    email: (typeof data['Email Address'] != 'undefined' ? data['Email Address'] : null),
                    type: (typeof data['Account Type'] != 'undefined' ? data['Account Type'] : null),
                    industry: (typeof data.Industry != 'undefined' ? data.Industry : null),
                    lead_source_id: sourceId,
                    created_on : (typeof data['Created Time'] != 'undefined' ? data['Created Time'] : null)
                };

                if (typeof domain.domain != null) {
                    cron.connection.query(
                        'SELECT creator_id, name, domain, phone, phone, email, type, industry, lead_source_id, created_on FROM zoho_domain WHERE domain = \'' + account.domain + '\'',
                        function (err, rows, fields) {
                            if (!err && typeof rows.length != 'undefined') {
                                if (rows.length == 0) {
                                    //	New Account
                                    cron.connection.query(
                                        'INSERT INTO zoho_domain SET ?', domain, function (err, result) {
                                        });
                                } else {
                                    var apiDate = new Date(domain.created_on);
                                    var dbDate = new Date(rows[0].created_on);
                                	if (dbDate <= apiDate && JSON.stringify(domain) != JSON.stringify(rows[0])) {
                                        cron.connection.query(
                                            'UPDATE zoho_domain SET creator_id = ?, lead_source_id = ?, name = ?, created_on = ?, phone = ?, email = ?, type = ?, industry = ? WHERE domain = ?',
                                            [domain.creator_id, sourceId, domain.name, domain.created_on, domain.phone, domain.email, domain.type, domain.industry, domain.domain], function (err, result) {
                                            });
									}
                                }
                            }
                        });
                }

				cron.connection.query(
					'SELECT id, owner_id, name, domain, phone, email, type, industry FROM zoho_account WHERE id = \''+data.ACCOUNTID+'\'',
					function(err, rows, fields){
                        if (!err && typeof rows.length != 'undefined') {
                            if (rows.length == 0) {
                                //	New Account
                                account.lead_source_id = sourceId;
                                account.creator_id = data.SMCREATORID;
                                account.created_on = data['Created Time'];
                                cron.connection.query(
                                    'INSERT INTO zoho_account SET ?', account,
                                    function (err, result) {
                                        callback(data, data.ACCOUNTID);//result.insertId
                                    });
                            }
                            else {
                                //	Existing Account
                                if (JSON.stringify(account) != JSON.stringify(rows[0])) {
                                    cron.connection.query(
                                        'UPDATE zoho_account SET owner_id = ?, name = ?, domain = ?, phone = ?, email = ?, type = ?, industry = ? WHERE id = ?',
                                        [account.owner_id, account.name, account.domain, account.Phone, account.email, account.type, account.industry, account.id], function (err, result) {
                                        	if(err){
                                        		logger.debug("crm account updation error occureed ");
                                                logger.debug(err);
                                                console.log("crm account updation error occureed ");
                                                console.log(err);
                                                callback(data, data.ACCOUNTID);//rows[0].id

                                            } else {
                                                callback(data, data.ACCOUNTID);//rows[0].id;

                                            }
                                        });
								}
                            }
                        }
					});
			});
	},

	getZohoInvoices: function(data, callback){
		logger.debug("Updating the zoho invoice table");
		cron.getZohoContact(data.customer_id);
		var invoice = {
			invoice_id: data.invoice_id, invoice_number: data.invoice_number, customer_id: data.customer_id,
			status: data.status, date: data.date, due_date: data.due_date, currency_code: data.currency_code,
			is_viewed_by_client: data.is_viewed_by_client, client_viewed_time: data.client_viewed_time,
			total: data.total, balance: data.balance, created_time: data.created_time, last_modified_time: data.last_modified_time, salesperson_name: data.salesperson_name
		};

		cron.connection.query(
			'SELECT '+
			'invoice_id, invoice_number, customer_id, status, date, due_date, currency_code, is_viewed_by_client, '+
			'client_viewed_time, total, balance, created_time, last_modified_time, salesperson_name '+
			'FROM zohobooks_invoice WHERE invoice_id = \''+data.invoice_id+'\'',
			function(err, rows, fields) {
                if (!err && typeof rows.length != 'undefined') {
                    if (rows.length == 0) {
                        //	New Invoice
                        cron.connection.query(
                            'INSERT INTO zohobooks_invoice SET ?', invoice,
                            function (err, result) {
                                callback(data.invoice_id);
                            });
                    }
                    else {
                        //	Existing Invoice
                        if (JSON.stringify(invoice) != JSON.stringify(rows[0])) {
                            cron.connection.query(
                                'UPDATE zohobooks_invoice SET ' +
                                'invoice_number = ?, customer_id = ?, status = ?, date = ?, due_date = ?, ' +
                                'currency_code = ?, is_viewed_by_client = ?, client_viewed_time = ?, total = ?, balance = ?, ' +
                                'created_time = ?, last_modified_time = ?, salesperson_name = ? ' +
                                'WHERE invoice_id = ?',
                                [
                                    data.invoice_number, data.customer_id, data.status, data.date, data.due_date,
                                    data.currency_code, data.is_viewed_by_client, data.client_viewed_time, data.total,
                                    data.balance, data.created_time, data.last_modified_time, data.salesperson_name, data.invoice_id
                                ],
                                function (err, result) {
                                }
                            );
                        }
                        callback(data.invoice_id);
                    }
                }
            }
		);
	},

    updateViwoPlan: function(data){
        logger.debug("Updating the zoho plan ");
        var serviceId = 0;
		var planName = data.plan_name;
		if (planName == G_APPS_MONTHLY_ANNUAL) {
        	serviceId = 33;
		} else if (planName == G_APPS_UMLIMITTED_MONTHLY_ANNUAL){
        	serviceId = 32;
		} else if (planName == G_ENTERPISE_MONTHLY_ANNUAL){
			serviceId = 37;
		} else if (planName == G_APPS_ANNUAL){
            serviceId = 5;
		} else if (planName == G_APPS_UMLIMITTED_ANNUAL){
            serviceId = 4;
		} else if (planName == G_ENTERPISE_ANNUAL){
            serviceId = 30;
		} else if (planName == G_APPS_FLEXIBLEL){
			serviceId = 3;
		} else if (planName == G_APPS_UMLIMITTED_FLEXIBLE){
			serviceId = 2;
		} else if (planName == G_ENTERPISE_FLEXIBLE){
			serviceId = 41;
		}
		if (data.customer_name != 'undefined' && serviceId != 0){
			var cusName = data.customer_name;
			cusName = cusName.replace("'", "\\'");
            cron.connection.query(
            	'SELECT su.id FROM subscription su left join customer c on su.cus_id = c.id left join zoho_account za on za.domain=c.domain ' +
            	'where za.name =  \''+cusName+'\' and  su.service_id in (4,5,21,22,30, 33, 32, 37, 35, 36)',
            	function (err,  rows, fields) {

            		if (err) {
            			console.log("error occured in fetching subscriptions");
            			console.log(data.customer_name);
                        console.log(data.plan_name);
            			console.log(err);
					} else if (rows.length > 0 && serviceId != 0) {
            			var latestId = rows.length - 1;
                        cron.connection.query(
                            'UPDATE subscription SET service_id = ? WHERE id = ?', [serviceId, rows[latestId].id], function(err, result){});

					}
            	}

            );
		}
    },

	getZohoUser: function(id, fullname){
		logger.debug("Updating the zoho user table");
		cron.connection.query(
			'SELECT id, fullname FROM zoho_user WHERE id = \''+id+'\'',
			function(err, rows, fields){
				if (!err && typeof rows.length != 'undefined' ) {
                    if (rows.length == 0) {
                        //	New User - First insert the user
                        cron.connection.query(
                            'INSERT INTO zoho_user SET ?', {id: id, fullname: fullname}, function (err, result) {
                            });
                    }
                    else{
                        //	Existing User - Check if name changed
                        if (rows[0].fullname != fullname)
                            cron.connection.query(
                                'UPDATE zoho_user SET fullname = ? WHERE id = ?', [fullname, id], function(err, result){});
                    }
				}
			});
	},

	getZohoContact: function(contact_id){
		logger.debug("Updating the zohobooks_contact table");
		cron.connection.query('SELECT contact_id FROM zohobooks_contact WHERE contact_id = \''+contact_id+'\'', function(err, rows, fields) {
			if (!err && typeof rows.length != 'undefined' && rows.length == 0) {
				cron.processZohoContact(contact_id, function (data) {
					var contact = {
						contact_id: data.contact_id, zcrm_account_id: data.zcrm_account_id, contact_name: data.contact_name,
						company_name: data.company_name, website: data.website, status: data.status, last_modified_time: data.last_modified_time
					};
					//	New Contact - First insert the contact
					cron.connection.query('INSERT INTO zohobooks_contact SET ?', contact, function (err, result) {});
				});
			}
		});
	},

	zohoLeadSourceCache: {},

	getZohoLeadSource: function(leadSource, callback){
		logger.debug("Updating the zoho lead source table");
		if (typeof cron.zohoLeadSourceCache[leadSource] != 'undefined'){
			cron.zohoLeadSourceCache[leadSource].push(callback);
		}
		else{
			cron.zohoLeadSourceCache[leadSource] = [callback];
			cron.connection.query(
				'SELECT id FROM zoho_lead_source WHERE description = \''+leadSource+'\'',
				function(err, rows, fields){
					var callbacks = cron.zohoLeadSourceCache[leadSource];
					cron.zohoLeadSourceCache[leadSource] = [];
					if (!err && typeof rows.length != 'undefined') {
                        if (rows.length == 0) {
                            cron.connection.query(
                                'INSERT INTO zoho_lead_source SET ?', {description: leadSource},
                                function(err, result){
                                    for (var i = 0; i < callbacks.length; i++)
                                        callbacks[i](result.insertId);
                                });
                        }
                        //	New Lead Source - First insert it
                        else {
                        	if (typeof callbacks!= 'undefined' && typeof callbacks.length != 'undefined'){ //TODO check this logic
                                for (var i = 0; i < callbacks.length; i++)
                                    callbacks[i](rows[0].id);
							}
                        }
					}
				});
		}
	},

	/*safeAttrib: function(obj, attrib){
	 if (typeof obj != 'undefined' && typeof obj[attrib] != 'undefined')
	 return obj[attrib];
	 return null;
	 },*/

	//	-----------------------------------------------------------------------------------------------------------------------------------------------

	// public
	process: function(account, connection, config, processDate, processTime, manualSync, callback){
		//console.log(account);
		logger.error("cron is running");
		logger.debug("Connecting to the subscription information account : " + account);
		var google = require('googleapis');
		var googleAuth = require('google-auth-library');
		var credentials = JSON.parse(fs.readFileSync('cert/client_secret_208891421206-gorc991b3t4go3bbm4ucic3ro4rv0gsg.apps.googleusercontent.com.json', 'utf8'));
		var auth = new googleAuth();
		var oauth2Client = new auth.OAuth2(credentials.installed.client_id, credentials.installed.client_secret, config.google.redirectUri.replace('sign-in', 'connect'));
		//
		logger.error(`oauth2Client: ${JSON.stringify(oauth2Client)}`);
		fs.readFile(__dirname+'/.credentials/'+account+'.token',
			function(err, token){
				if (err)
					logger.error('Account '+account+' is not connected due to ' + err);
				else{
					//	Authenticate for API
					oauth2Client.credentials = JSON.parse(token);
					var service = google.reseller('v1');
					logger.error(`service: ${JSON.stringify(service)}`);
					//	Data structure to store counts of each records processed/added
					//	Put a devils weight since there is a possibility of all records processed before the next page is fetched and trigerring the all-completed callback (Anything above 100 shall do)
					var procData = {'addedCus': [], 'addedSrv': [], 'addedSbscr': [], 'addedEvt': [], 'subscrCount': 666};
					var foundSbscr = [];
					cron.connection = connection;
					cron.processDate = processDate;
					cron.processTime = processTime;
					logger.debug('\n--------'+account+'--------\n');
					cron.fetchPage(account.split('@')[1], account.split('@')[1], procData, service, manualSync, oauth2Client, null,
						//	Callback on each subscription processed
						function(subscrID){
							foundSbscr.push(subscrID);	//	These are the database IDs for subscriptions found in the database
						});
				}
			});
	},

	deleteAndIsertViwoPanel : function (account, accToDelete, subscriptions ) {
		logger.debug("Updating the viwo panel table");
        cron.connection.query("DELETE FROM viwo_panel WHERE zohoAdmin = ? ", [accToDelete], function(err, results) {
            logger.debug('Data has been deleted in the vivo panel')
            if (!err) {
                logger.debug("inserting data into viwo-panel from " + account);
                for (var i = 0; i < subscriptions.length; i++){
                    new cron.insertToViwoPanel(account, subscriptions[i]);
                }
            }
        });
    },

    // private
	fetchPage: function(account, accountToDelete, procData, service, manualSync, client, nextPageToken, callback){
		logger.debug("Fetching subscription information from the account " + account + "page token : " + nextPageToken);
        service.subscriptions.list({auth: client, maxResults: 100, pageToken: nextPageToken}, function(err, response){
			if (err){
				return setTimeout(function(){
					//	Retry the same after half a second
					cron.fetchPage(account, accountToDelete, procData, service, manualSync, client, nextPageToken, callback);
				}, 500);
			}
			//	No error - proceed right-away
			cron.connection.query(
				'UPDATE http_requests SET request_count = request_count + 1 WHERE cron_id = ? AND api_source = ?', [cron.cron_id, account],
				function(err, rows, fields){
					var subscriptions = response.subscriptions;
					if (subscriptions.length > 0){
						if (!manualSync){
							// console.log("not a manual sync");
                            for (var i = 0; i < subscriptions.length; i++){
                                procData.subscrCount += 1;
                                new cron.getOrInsertCustomer(account, procData, subscriptions[i], callback);
                            }
						}

                        new cron.deleteAndIsertViwoPanel(account, accountToDelete, subscriptions);
						/*/	For the last record, we are checking if this is the last page
						 if (typeof response.nextPageToken != 'undefined')
						 new cron.getOrInsertCustomer(account, procData, subscriptions[subscriptions.length-1], false);
						 else	//	Last record of the last page - we are passing the callback down
						 new cron.getOrInsertCustomer(account, procData, subscriptions[subscriptions.length-1], callback);*/
					}
					//	Check if there are more pages
					if (typeof response.nextPageToken != 'undefined') {
						return setTimeout(function () {
							cron.fetchPage(account, "unknown", procData, service, manualSync, client, response.nextPageToken, callback);
						},500);

					} else {
                        cron.connection.query(
                            'UPDATE panel_metadata SET manual_update = ? WHERE account_name = ? ',['No', account],
                            function(err, rows, fields){
                                logger.error("error in db updation" + err );
                            }
                        );
						logger.debug("End the process of updating the database");
						procData.subscrCount -= 666;		//	Remove the devils weight since no more pages to fetch
					}
				}
			);
		});
	},

    // private
    insertToViwoPanel: function(account, subscription){
        //	Get Customer ID
	    	logger.error("Inserting the data to the viwo table");
	 var viwoPanelEntry = {
            id: subscription.subscriptionId,
            customerName: subscription.customerId,
            code:  subscription.skuId,
            domain: subscription.customerDomain,
            planType:  (typeof subscription.plan != 'undefined' ? subscription.plan.planName : null ),
            zohoAdmin: account,

            createdDate: cron.formatDate(subscription.creationTime),

            lastUpdated: (subscription.plan.isCommitmentPlan && typeof subscription.plan.commitmentInterval != 'undefined' ?
                cron.formatDate(subscription.plan.commitmentInterval.startTime) : '0000-00-00'),
            expires: (subscription.plan.isCommitmentPlan && typeof subscription.plan.commitmentInterval != 'undefined' ?
                cron.formatDate(subscription.plan.commitmentInterval.endTime) : '0000-00-00'),
            maxNoSeats: (typeof subscription.seats != 'undefined' && typeof subscription.seats.maximumNumberOfSeats != 'undefined' ?
            	subscription.seats.maximumNumberOfSeats : 0),
            purchasedLicense: (typeof subscription.seats != 'undefined' && typeof subscription.seats.numberOfSeats != 'undefined' ?
                subscription.seats.numberOfSeats : 0),
            isTrial: (subscription.trialSettings.isInTrial ? 'Yes' : 'No'),
            trailExpires: (subscription.trialSettings.isInTrial ? cron.formatDate(subscription.trialSettings.trialEndTime) : '0000-00-00'),
            renewalType: (typeof subscription.renewalSettings != 'undefined' && typeof subscription.renewalSettings.renewalType != 'undefined' ?
                subscription.renewalSettings.renewalType.replace(/_/g, ' ') : null)
        };

        cron.connection.query(
            'INSERT INTO viwo_panel SET ?',
            viwoPanelEntry,
            function(err, result){

            	if(err){
            		throw err;
				}
            });
    },


    //	------------------------------------------------------------------------------------------------------------------------------------------------------------

	// private
	getOrInsertCustomer: function(account, procData, subscription, callback){
    	logger.debug("Updating the customer table ");
//console.log(subscription);
		//	Get Customer ID
		cron.connection.query(
			'SELECT id FROM customer WHERE domain = \''+subscription.customerDomain+'\' '+
			'OR customerid = \''+subscription.customerId+'\' '+
			'OR domain = \''+subscription.customerId+'\' ORDER BY id',
			function(err, rows, fields){

                if (!err && typeof rows.length != 'undefined'){
                    if (rows.length == 0) {
                        //	New Customer - First insert customer
                        cron.connection.query(
                            'INSERT INTO customer SET ?',
                            {customerid: subscription.customerId, domain: subscription.customerDomain},
                            function (err, result) {
                                procData.addedCus.push(subscription.customerDomain);
                                cron.getOrInsertService(account, procData, result.insertId, subscription, callback);
                            });
                    }
                    else{
                        //	Existing Customer - Proceed right-away
                        cron.getOrInsertService(account, procData, rows[0].id, subscription, callback);
                        cron.connection.query(
                            'UPDATE customer SET customerid = ?, domain = ? WHERE id = ?',
                            [subscription.customerId, subscription.customerDomain, rows[0].id],
                            function(err, result){});
                    }
				}
			});
	},

	// private
	getOrInsertService: function(account, procData, customerId, subscription, callback){
		//	Caching can improve this.!
		logger.debug("Updating the customer table");
		if (typeof servicesCache[subscription.plan.planName+':'+subscription.skuId] != 'undefined')
			cron.getOrInsertSubscription(account, procData, customerId, servicesCache[subscription.plan.planName+':'+subscription.skuId], subscription, callback);
		else
			cron.connection.query(
				'SELECT id FROM service WHERE code = \''+subscription.skuId+'\' '+
				'AND plan = \''+subscription.plan.planName+'\' ORDER BY id',
				function(err, rows, fields){
					if (!err && typeof rows.length != 'undefined') {
                        if (rows.length == 0) {
                            //	New Service - First insert it
                            cron.connection.query(
                                'INSERT INTO service SET ?',
                                {code: subscription.skuId, plan: subscription.plan.planName, display: 1 , skuName : subscription.skuName, color : cron.getRandomColor()},
                                function (err, result) {
                                    if (!err) {
                                        cron.getOrInsertSubscription(account, procData, customerId, result.insertId, subscription, callback);
                                        procData.addedSrv.push(subscription.customerDomain);
                                        servicesCache[subscription.plan.planName + ':' + subscription.skuId] = result.insertId;
                                    }
                                });
                        } else {
                            //	Existing Service - Proceed right-away
							if (typeof rows[0].skuName == 'undefined' ||  rows[0].skuName == null){
                                cron.connection.query(
                                    'UPDATE service SET skuName = ? WHERE code = ?',
                                    [subscription.skuName, subscription.skuId],
                                    function(err, result){});
							}
                            cron.getOrInsertSubscription(account, procData, customerId, rows[0].id, subscription, callback);
                            servicesCache[subscription.plan.planName+':'+subscription.skuId] = rows[0].id;
                        }
					} else {
						console.log("error in subscription");
					}
				});
	},

	// private
	getOrInsertSubscription: function(account, procData, customerId, serviceId, subscription, callback){
		logger.debug("Updating the subscription table");
		cron.connection.query(
			'SELECT id FROM subscription WHERE order_id = '+subscription.subscriptionId+' '+
			'ORDER BY id',
			function(err, rows, fields){
                if (!err && typeof rows.length != 'undefined') {
                    if (rows.length == 0){
                    //	New Subscription - First insert it
						var subscrEvnt = {
                            cus_id: customerId,
                            service_id: serviceId,
                            created_on: cron.formatDate(subscription.creationTime),
                            zoho_admin: account,
                            order_id: subscription.subscriptionId,
                            is_commitment: subscription.plan.isCommitmentPlan,
							cron_date: cron.processDate,
							entry_exist : 1,
                            subscription_no : 1
                        };
                        cron.connection.query(
                            'INSERT INTO subscription SET ?',
                            subscrEvnt,
                            function (err, result) {
                            	if (!err) {
                                    procData.addedSbscr.push([customerId, serviceId]);
                                    if (result.insertId != 'undefined') {
                                        cron.updateSubscriptionEventLog(procData, result.insertId, subscription,
                                            function (customerDomain) {
                                                //procData.foundSbscr.push(result.insertId);
                                                callback(result.insertId);
                                            });
                                    }
                                } else {
                            		logger.error("exeception in inserting to the subscription table " + err );
                                }
                            });
                } else {
                        //	Existing Subscription - Proceed right-away
                        cron.updateSubscriptionEventLog(procData, rows[0].id, subscription,
                            function (customerDomain) {
                                //procData.foundSbscr.push(rows[0].id);
								if (subscription.plan.isCommitmentPlan && subscription.plan.isCommitmentPlan == true){
                                    subscription.plan.isCommitmentPlan = 1;
								} else {
                                    subscription.plan.isCommitmentPlan = 0;
								}

                                cron.connection.query(
                                    'UPDATE subscription SET is_commitment = ?, cron_date = ?, entry_exist = ? WHERE order_id = ? ',
                                    [subscription.plan.isCommitmentPlan, cron.processDate, 1, subscription.subscriptionId],
                                    function(err, result){
                                    	if (err){
                                    		console.log("error in updating subscription cron");
                                    		console.log(err)
                                            logger.error("exception in inserting to the subscription table " + err );
										} else {

										}
                                        callback(1);//have to remove
									});
                            });
                    }

                }
			});
	},

	// private
	updateSubscriptionEventLog: function(procData, subscriptionId, subscription, callback){
		logger.debug("Updating the subscription event table");
		cron.connection.query(
			'SELECT subscr_id, new_status, start_date, end_date, seats, seats_max, seats_licensed, is_trial, trial_end_date, renew_type '+
			'FROM subscription_event WHERE subscr_id = '+subscriptionId+' ORDER BY id DESC LIMIT 0, 1',
			function(err, rows, fields){
				var extEvt = {};
				if (rows.length == 1){
					extEvt = rows[0];
					extEvt.start_date = extEvt.start_date != '0000-00-00' ? extEvt.start_date.sqlFormatted() : extEvt.start_date;
					extEvt.end_date = extEvt.end_date != '0000-00-00' ? extEvt.end_date.sqlFormatted() : extEvt.end_date;
					extEvt.trial_end_date = extEvt.trial_end_date != '0000-00-00' ? extEvt.trial_end_date.sqlFormatted() : extEvt.trial_end_date;
				}
				var newEvt = {
					subscr_id: subscriptionId,
					new_status: subscription.status,
					start_date: (subscription.plan.isCommitmentPlan && typeof subscription.plan.commitmentInterval != 'undefined' ?
						cron.formatDate(subscription.plan.commitmentInterval.startTime) : '0000-00-00'),
					end_date: (subscription.plan.isCommitmentPlan && typeof subscription.plan.commitmentInterval != 'undefined' ?
						cron.formatDate(subscription.plan.commitmentInterval.endTime) : '0000-00-00'),
                    seats: (typeof subscription.seats != 'undefined' && typeof subscription.seats.numberOfSeats != 'undefined' ?
                        subscription.seats.numberOfSeats : 0),
					seats_max: (typeof subscription.seats != 'undefined' && typeof subscription.seats.maximumNumberOfSeats != 'undefined' ?
                        subscription.seats.maximumNumberOfSeats : 0),
					seats_licensed: (typeof subscription.seats != 'undefined' && typeof subscription.seats.licensedNumberOfSeats != 'undefined' ?
                        subscription.seats.licensedNumberOfSeats : 0),
					is_trial: (subscription.trialSettings.isInTrial ? 1 : 0),
					trial_end_date: cron.formatDate(subscription.trialSettings.trialEndTime),
					renew_type: (typeof subscription.renewalSettings != 'undefined' && typeof subscription.renewalSettings.renewalType != 'undefined' ?
						subscription.renewalSettings.renewalType.replace(/_/g, " ") : null)
				};
				extEvt = JSON.stringify(extEvt);
				newEvt.cron_date = cron.processDate;
				if (extEvt == '{}' && newEvt.start_date != '0000-00-00')
					newEvt.event_time = newEvt.start_date;
				else
					newEvt.event_time = cron.processDate;
				//
				cron.connection.query(
					'INSERT INTO subscription_event SET ?', newEvt,
					function(err, result){
						if (err)
							logger.error("Error occured in inserting the data to the subscription w=event table" + err);
						else{
							procData.addedEvt.push(result.insertId);
//console.log(subscription.customerDomain);
						}
						callback(subscription.customerDomain);
					});
			});
	},
	formatDate: function(timestamp){
		if (typeof timestamp == 'undefined')
			return '0000-00-00';

        var momentDate =  moment(parseInt(timestamp)).tz("America/Los_Angeles").format('YYYY-MM-DD');
		return momentDate;
	},
	sha256: function(data){
		return crypto.createHash("sha256").update(data).digest("base64");
	},

    getRandomColor: function() {
    var letters = '0123456789ABCDEF';
    var color = '#';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}
}
