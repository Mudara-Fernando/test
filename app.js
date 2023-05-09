
//var arc = require('arc');
//require('./lib.js');

//	zoho_admin@reseller.viwopanel.com	4/eazxhrdleTo6qy3KgJvbgAmwpxIYcPc2H5SI2zGQdjE
//	zoho_admin@reseller.viruswoman.com	4/nfVTkuPNDuwwZTj_CA2LuMpSlIRCE1NR53s7-we_SsQ

var fs = require('fs');
var sql = require('./sql');
var mysql = require('mysql');
var express = require('express');
var session = require('client-sessions');
const log4js = require('log4js');

log4js.configure({
    appenders: { app_log: { type: 'file', filename: 'logs/viwo-dashboard.log', level:'debug' }},
    categories: { default: { appenders: ['app_log'], level: 'info' } }
});

const logger = log4js.getLogger('app_log');

var config = JSON.parse(fs.readFileSync(__dirname+'/config.json', 'UTF-8'));

//	-----------------------------------------------------------------------------
//	Keep a persistant connection to the database (reconnect after an error or disconnect)
//	-----------------------------------------------------------------------------
if (typeof config.databaseConnection == 'undefined' || typeof config.databaseConnection.retryMinTimeout == 'undefined')
	config.databaseConnection = {retryMinTimeout: 2000, retryMaxTimeout: 60000};
var connection, retryTimeout = config.databaseConnection.retryMinTimeout;
function persistantConnection(){
	connection = mysql.createConnection(config.database);
	connection.connect(
		function (err){
			if (err){
                logger.error('Error connecting to database: '+err);
				setTimeout(persistantConnection, retryTimeout);
                logger.debug('Retrying in '+(retryTimeout / 1000)+' seconds');
				if (retryTimeout < config.databaseConnection.retryMaxTimeout)
					retryTimeout += 1000;
			}
			else{
				retryTimeout = config.databaseConnection.retryMinTimeout;
                logger.debug('Connected to database');
			}
		});
	connection.on('error',
		function (err){
            logger.error('Database error: '+err.code);
			if (err.code === 'PROTOCOL_CONNECTION_LOST')
				persistantConnection();
		});
}
persistantConnection();
//var connection = mysql.createConnection(config.database);
//connection.connect();

var ignorePlans = config.ignorePlans;//'\'FLEXIBLE\', \'FREE\', \'TRIAL\'';
var ignoreServices = config.ignoreServices;

const pool = mysql.createPool(config.database);

var app = express();
app.use(session(config.session));
var bodyParser = require('body-parser');

// configure the app to use bodyParser()
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

//	-----------------------------------------------------------------------------
//	Deliver the base template of SPA
//	-----------------------------------------------------------------------------
//app.get('/', function (req, res){
//     if (typeof req.session.userid == 'undefined' || req.session.userid == null)
//		res.redirect('/sign-in');
//	else{
//		/*var id_token = req.session.userid.id_token.split('.');
//		console.log((new Buffer(id_token[1], 'base64')).toString());
//		console.log(req.session.userid.id_token.hd);*/
//		var allowed_emails = ['viwoinc.com', 'villvay.com'];
//		allowed_emails = allowed_emails.concat(config.allowed_auth_emails);
//		if (allowed_emails.indexOf(req.session.userid.id_token.email) == -1)
//			res.redirect('/sign-in?error=Unauthorized');
//		else
//			res.send(loadTemplatePart('base.html'));
////            res.sendFile(path.join(config.root, 'base.html'));
//	}
//});

//	-----------------------------------------------------------------------------
//	Read Template HTML code to fill the UI
//	-----------------------------------------------------------------------------
app.get('/template/*', function (req, res){
	logger.debug("Directed to the /template/* url");
	var template = req.url.split('/').splice(2)[0];
	res.send(loadTemplatePart(template+'.html'));
});

//	-----------------------------------------------------------------------------
//	Deliver static assets
//	-----------------------------------------------------------------------------
app.use('/public', express.static('public')); // load everything in public
app.use('/public/controllers', express.static('public/controllers')); // and in controlers
app.use('/public/templates', express.static('public/templates')); // and any other
app.use('/public/assets', express.static('public/assets'));
//	============================================================================================

function promiseQuery(query, args) {
	return new Promise((resolve, reject) => {
		pool.getConnection((err, connection) => {
			if(err) return reject(err);
			connection.query(query, args, (err, rows) => {
				connection.release();
				if(err) {
					return reject(err);
				}
	
				return resolve(rows);
			});
		})

		
	});
	
}

//	-----------------------------------------------------------------------------
//	Executes a set of queries and write to response when all queries has returned raws
//	-----------------------------------------------------------------------------
function queryResultAsJSON(queries, res){
	res.set('Content-Type', 'application/json');
	logger.debug("Starting querying the db as JSON");
	new (function(queries, res){
			var toGo = 0, progress = 0;
			//	Iterate for all given queries
			for (var qName in queries){
				toGo += 1;	//	Increment the counter to number of queries to finish
				//	Create an object to keep track of the pointer to the specific query
				new (function(qName){
					//	Actually query the database
					// pool.getConnection((err, connection) => {

					// 	if(err) {
					// 		logger.error("error happened whild quering the databases : " + err);
					// 		logger.debug("issued query is : " + queries[qName]);
					// 		queries[qName] = err;
					// 	}

						connection.query(queries[qName],
							function(err, rows, fields){
								// connection.release();
								if (err){
									logger.error("error happened whild quering the databases : " + err);
									logger.debug("issued query is : " + queries[qName]);
									queries[qName] = err;
								} else
									queries[qName] = rows;
								progress += 1;
								//	When we have results for all queries ready - write to the response
								if (progress == toGo)
									res.json(queries);
							});
					// });
					
					})(qName);
			}
		})(queries, res);
	/*/
	connection.query(query,
		function(err, rows, fields){
			res.set('Content-Type', 'application/json');
			if (err){
				res.send(JSON.stringify(err));
			}
			else
				res.json(rows);
		});
	//*/
}

//	-----------------------------------------------------------------------------
//	Executes a set of queries and returns object when all queries have returned raw
//	-----------------------------------------------------------------------------
function queryResultAsObject(queries, iter, callback){
	//	Create an object instance so another thread can call this function while it is running these queries
    logger.debug("Starting querying the db as OBJECT");
	new (function(queries){
			var toGo = 0, progress = 0;
			//	Iterate for all given queries
			for (var qName in queries){
				toGo += 1;	//	Increment the counter to number of queries to finish
				//	Create an object to keep track of the pointer to the specific query
				new (function(qName){
					// pool.getConnection((err, connection) => {
					// 	if (err) {
					// 		logger.error("error happened whild quering the databases : " + err);
					// 		logger.debug("issued query is : " + queries[qName]);
					// 		queries[qName] = err;
					// 		return;
					// 	}

						connection.query(queries[qName],
							function(err, rows, fields){
								// connection.release();
								if (err) {
									logger.error("error happened whild quering the databases : " + err);
									logger.debug("issued query is : " + queries[qName]);
									queries[qName] = err;
								} else {
									queries[qName] = rows;
								}
								progress += 1;
								//	When we have results for all queries ready - write to the response
								if (progress == toGo){
									callback(queries, iter);
								}
							});
					// });
					//	Actually query the database
					
					})(qName);
			}
		})(queries);
}

//	-----------------------------------------------------------------------------
//	Get all Subscription Events (changes) for a given date (AUR, Suspended, Activated, New, Lost, etc..)
//	-----------------------------------------------------------------------------
app.get('/day-summery/*', function (req, res){
	logger.debug("Directing to the /day-summery/* url");
	var date = req.url.split('/').splice(2);
	//date = (new Date(date[0], date[1]-1, date[2]-16)).sqlFormatted();
	//
	var query1 = sql.daySummery(ignorePlans, date, 'reseller.viruswoman.com');
	var query2 = sql.daySummery(ignorePlans, date, 'reseller.viwopanel.com');
	//console.log(query1);
	queryResultAsJSON({'reseller.viruswoman.com': query1, 'reseller.viwopanel.com': query2}, res);
});
//	-----------------------------------------------------------------------------
//	Get viwo panel data
//	-----------------------------------------------------------------------------

app.post('/viwo-panel', function (req, res){
    var vivoPanel = sql.vivoPanel();
    var lastCron =sql.lastCron() + 'WHERE `api_source`="reseller.viruswoman.com" OR `api_source`="reseller.viwopanel.com"';
    //queryResultAsJSON({'panels': vivoPanel}, res);
	var panelStatus = sql.panelStatus();
    logger.debug('Redirceting to the viwo-panels');
    queryResultAsJSON({'panels': vivoPanel, 'lastcrondate':lastCron, 'panelStatus' : panelStatus}, res);
});


app.get('/vivo-panel-cron', function (req, res){
    logger.debug('Running the viwo panel manual synchronization');
    new manualSyncForSubscriptionConsole(res,function () {

    });
    res.redirect('/viwo-panel');
});


//	-----------------------------------------------------------------------------
//	Get Total License count upto a given date
//	-----------------------------------------------------------------------------
app.post('/license-count', function (req, res){
	logger.debug("Getting the license count");
	var nextMonFDate = req.body.endDate;
	// var query = sql.licenseCount(ignoreServices, nextMonFDate);
	// queryResultAsJSON({'license_count': query}, res);

	const query = sql.licenseCountNew();

	promiseQuery(query, [nextMonFDate, ignoreServices])
		.then(result => {
			res.json(result);
		})
		.catch(e => {
			console.log('[/license-count]', e);
			res.status(500).json(e);
		});

});





//	-----------------------------------------------------------------------------
//	Get Total License count for all previous months
//	-----------------------------------------------------------------------------
// app.post('/license-count-all', function (req, res){
// 	var endDate = req.body.endDate;
// 	var query1 = sql.licenseCountForAllMonths(ignorePlans, endDate, 'reseller.viruswoman.com');
// 	var query2 = sql.licenseCountForAllMonths(ignorePlans, endDate, 'reseller.viwopanel.com');
// 	queryResultAsJSON({'reseller.viruswoman.com': query1, 'reseller.viwopanel.com': query2}, res);
// });

app.post('/license-count-all', function (req, res){
	// return res.json({});
	logger.debug("Getting the license count all");
	res.set('Content-Type', 'application/json');
    var nextMonFDate = req.body.endDate;

	var monthStart = new Date(nextMonFDate);
	var finalResult = {
		"reseller.viruswoman.com": [],
		"reseller.viwopanel.com": []
	};
	var month;
	var monthInName;
	var monthInNum;
    var plan;
    var flexible = 'FLEXIBLE';
    var originalLicenses;
	var premiumLicenses;
	
	const query = sql.licenseCountForAllMonthsNew();
	const zohoAdmin = { virusWoman: 'reseller.viruswoman.com', viwoPanel: 'reseller.viwopanel.com' };

	let toBeQueried = [];
	
	for(let i=0; i < 6; i++) {

		if (i === 0){
            month = nextMonFDate;
            monthInName = "current";
            monthInNum = "current";
            monthStart.setDate(1);
		} else {
			monthStart.setMonth(monthStart.getMonth()-1);  	
			monthInNum = monthStart.getFullYear() + "-" + (monthStart.getMonth() + 1);
			monthInName = monthStart.getFullYear() + "-" + monthStart.toLocaleString('en-us', { month: "long" });					   
		}

		month = monthStart.sqlFormatted();
		console.log(['NAME'], month);
		toBeQueried.push(promiseQuery(query, [ monthInNum, monthInName, month, ignoreServices ]));

	}

	Promise
		.all(toBeQueried)
		.catch(e => console.log(e))
		.then(results => {

			/* Flatten the results array and reverse the order */
			results = results.reduce((acc, cv) => acc.concat(cv) ).reverse();

			/* Returned result set contains for both admin so we filter them seperately */
			let virusWomanResults = results.map(result => (result['zoho_admin'] === zohoAdmin.virusWoman) ? result : '' ).filter(result => (result !== ''))
			let viwoPanelResults = results.map(result => (result['zoho_admin'] === zohoAdmin.viwoPanel) ? result : '').filter(result => (result !== ''));

			let responseData = {
				[zohoAdmin.virusWoman] : virusWomanResults,
				[zohoAdmin.viwoPanel] : viwoPanelResults
			}

			res.json(responseData);

		});


	// for(var i=0; i < 9; i++){
    //     month = monthStart.sqlFormatted();
	// 	if (i == 0){
    //         month = nextMonFDate;
    //         monthInName = "current";
    //         monthInNum = "current";
    //         monthStart.setDate(1);
	// 	} else {
	// 		monthInName = monthStart.getFullYear()+"-"+(monthStart.getMonth()+1);
    //         monthInNum = monthStart.getFullYear()+"-"+monthStart.toLocaleString('en-us', { month: "long" });
    //         monthStart.setMonth(monthStart.getMonth()-1);
	// 	}
	// 	var query = sql.licenseCountForAllMonths(
    //         ignoreServices,
	// 		month,
    //         monthInName,
    //         monthInNum
	// 	);
	// 	queryResultAsObject({'monthly_licenses': query}, i, function (result, i) {
    //         originalLicenses = 0 ;
    //         premiumLicenses = 0 ;

    //         for (var entry in result['monthly_licenses']){
    //             zohoAdmin = result['monthly_licenses'][entry].zoho_admin;
    //             plan = result['monthly_licenses'][entry].plan;
    //             if (plan ==flexible){
    //                 if (zohoAdmin == 'reseller.viruswoman.com'){
    //                     originalLicenses += result['monthly_licenses'][entry].licenses;
    //                 } else {
    //                     premiumLicenses += result['monthly_licenses'][entry].licenses;
    //                 }
    //             } else {//fixedLicenses
    //                 if (zohoAdmin == 'reseller.viruswoman.com'){
    //                     originalLicenses += result['monthly_licenses'][entry].fixedLicenses;
    //                 } else {
    //                     premiumLicenses += result['monthly_licenses'][entry].fixedLicenses;
    //                 }
    //             }
    //         }

	// 		finalResult['reseller.viruswoman.com'].push({
	// 			licenses: originalLicenses,
	// 			d1: result['monthly_licenses'][0].d1,
	// 			d2: result['monthly_licenses'][0].d2
	// 		});
	// 		finalResult['reseller.viwopanel.com'].push({
	// 			licenses: premiumLicenses,
	// 			d1: result['monthly_licenses'][0].d1,
	// 			d2: result['monthly_licenses'][0].d2
	// 		});

			

	// 		if(i == 8){
	// 			finalResult['reseller.viwopanel.com'].reverse();
	// 			finalResult['reseller.viruswoman.com'].reverse();
	// 			res.json(finalResult);
	// 		}
	// 	});
	// }
});

//	-----------------------------------------------------------------------------
//	Get Total Revenue count upto a given date
//	-----------------------------------------------------------------------------
app.post('/revenue-count', function (req, res){
	logger.debug("Getting the revenue count");
	var endDate = req.body.endDate;
	//	Sum of last records befo{re the first day of next month
	var query = sql.totalRevenueCount(ignorePlans, endDate);
	queryResultAsJSON({'result': query}, res);
});

//	-----------------------------------------------------------------------------
//	Get Total Revenue for a given time period
//	-----------------------------------------------------------------------------
app.post('/revenue-count-range', function (req, res){
	logger.debug("Getting the revenue count range");
    var month_start = req.body.startDate;
	var month_end = req.body.endDate;
	var invoice_list = (req.body.invoice_list != undefined)? req.body.invoice_list: false;

	var query = sql.revenueCount(ignorePlans, month_start, month_end, invoice_list);
	queryResultAsJSON({'result': query}, res);
});

//	-----------------------------------------------------------------------------
//	Get Total Subscriptions and Licenses for a given month by SKU - regardless of plan
//	-----------------------------------------------------------------------------
app.get('/total-licenses-all-plans/*', function (req, res){
	logger.debug("Getting total-license-all-plans");
	var nextMonFDate = req.url.split('/').splice(2);
	nextMonFDate = (new Date(nextMonFDate[0], nextMonFDate[1], 1)).sqlFormatted();
	//	Sum of last records before the first day of next month
	var query1 = sql.totalLicensesAllPlans(ignorePlans, nextMonFDate, 'reseller.viruswoman.com');
	var query2 = sql.totalLicensesAllPlans(ignorePlans, nextMonFDate, 'reseller.viwopanel.com');
	queryResultAsJSON({'reseller.viruswoman.com': query1, 'reseller.viwopanel.com': query2}, res);
});

//	============================================================================================

//	-----------------------------------------------------------------------------
//	Get Total Subscriptions and Licenses for a given month by SKU and plan
//	-----------------------------------------------------------------------------
app.post('/total-licenses', function (req, res){
	logger.debug("Getting the total licenses");
	var endDate = req.body.endDate;
	var plans = (req.body.plans != undefined)? req.body.plans: [];
	var code = (req.body.code != undefined)? req.body.code: [];
	var params = {'code' : code , 'plans' : plans};

	var query1 = sql.totalLicenses(ignoreServices, endDate, 'reseller.viruswoman.com', (plans.length > 0 ? params : false));
	var query2 = sql.totalLicenses(ignoreServices, endDate, 'reseller.viwopanel.com', (plans.length > 0 ? params : false));

	queryResultAsJSON({'reseller.viruswoman.com': query1, 'reseller.viwopanel.com': query2}, res);
});

//	============================================================================================

//	-----------------------------------------------------------------------------
//	Get Total Subscriptions and Licenses for a given month by SKU and plan
//	-----------------------------------------------------------------------------
app.get('/total-revenue/*', function (req, res){
	logger.debug("Getting the total revenue");
	var arg_date = req.url.split('/').splice(2);
	var month_start = new Date(arg_date[0], arg_date[1], 1);
	month_start.setMonth(month_start.getMonth()-1);
	month_start = month_start.sqlFormatted()+' 00:00:00';
	var month_end = new Date(arg_date[0], arg_date[1], 1);
	month_end.setDate(month_end.getDate()-1);
	month_end = month_end.sqlFormatted()+' 00:00:00';
	var params = req.url.split('/').splice(4);
	//	Sum of last records before the first day of next month
	var query = sql.revenueCount(ignorePlans, month_start, month_end, (params.length > 1 ? params : false));
	queryResultAsJSON({'response': query}, res);
});

//	-----------------------------------------------------------------------------
//	Get New Subscriptions By Salesperson
//	-----------------------------------------------------------------------------
app.post('/by-salesperson', function (req, res){
	logger.debug("Getting db information for by salesperson page");
	var startDate = req.body.startDate;
	var endDate = req.body.endDate;
	var params = (req.body.params != undefined)? req.body.params: '';

	var query1 = sql.newSubscriptionLicensesBySales(startDate, endDate, (params != '' ? params : false), ignoreServices);
	var query2 = sql.licenseChangeForActiveSubscriptionsBySales(startDate, endDate, (params != '' ? params : false), ignoreServices);
    var query3 = sql.licensechangeForSubscriptionChangeBySales(startDate, endDate,  (params != '' ? params : false), ignoreServices);
    queryResultAsJSON({'new_subscriptions': query1, 'active_subscriptions': query2, 'change_subscriptions': query3}, res);
});
//	-----------------------------------------------------------------------------
//	Get New Subscriptions By Lead Source
//	-----------------------------------------------------------------------------
app.post('/by-lead-source', function (req, res){
    logger.debug("Getting db information for by lead source page");
	var startDate = req.body.startDate;
	var endDate = req.body.endDate;
	var params = (req.body.params != undefined)? req.body.params: [];

	var query5 = sql.newSubscriptionLicensesByLead(startDate, endDate, (params.length > 1 ? params[0] : false), ignoreServices);
    var query6 = sql.licenseChangeForActiveSubscriptionsByLead(startDate, endDate, (params.length > 1 ? params[0] : false), ignoreServices);
    var query7 = sql.licensechangeForSubscriptionChangeByLead(startDate, endDate, (params.length > 1 ? params[0] : false), ignoreServices);
    queryResultAsJSON({'new_subscriptions': query5, 'active_subscriptions': query6, 'change_subscriptions': query7}, res);
});

//	-----------------------------------------------------------------------------
//	Get Revenue By Salesperson
//	-----------------------------------------------------------------------------
app.post('/revenue-by-salesperson', function (req, res){
    logger.debug("Getting db information for revenue by salesperson");
    var startDate = req.body.startDate;
	var endDate = req.body.endDate;
	var params = (req.body.params != undefined)? req.body.params: '';

	var query = sql.revenueBySalesperson(ignorePlans, endDate, startDate, (params != '' ? params : false));
	queryResultAsJSON({'result': query}, res);
});

//	-----------------------------------------------------------------------------
//	Get Revenue By Lead Source
//	-----------------------------------------------------------------------------
app.post('/revenue-by-lead-source', function (req, res){
    logger.debug("Getting db information for revenue by lead source");
	var startDate = req.body.startDate;
	var endDate = req.body.endDate;
	var params = (req.body.params != undefined)? req.body.params: [];

	var query = sql.revenueByLeadSource(ignorePlans, endDate, startDate, (params.length > 1 ? params[0] : false));
	queryResultAsJSON({'result': query}, res);
});

//	-----------------------------------------------------------------------------
//	Get New Subscriptions and Licenses for a given date range
//	-----------------------------------------------------------------------------
app.post('/new-subscriptions', function (req, res){
    logger.debug("Getting db information for new subscriptions");
    var startDate = req.body.startDate;
	var endDate = req.body.endDate;
	var params = (req.body.params != undefined)? req.body.params: [];

	var query1 = sql.newSubscriptionLicenses(startDate, endDate, (params.length > 1 ? params : false), ignoreServices);
	var query2 = sql.licensechangeForSubscriptionChange(startDate, endDate, (params.length > 1 ? params : false), ignoreServices);

	queryResultAsJSON({'change_subscription': query2, 'new_subscription': query1}, res);
});


//	-----------------------------------------------------------------------------
//	Get New Licenses for a given period and handle inner pages of 'New Licenses'
//	-----------------------------------------------------------------------------
app.post('/new-license/*', function (req, res){
    logger.debug("Getting db information for new licenses");
	var startDate = req.body.startDate;
	var endDate = req.body.endDate;
	var params = (req.body.params != undefined)? req.body.params: '';

    var queryFornewSubscription = sql.newSubscriptionLicenses(startDate, endDate, (params != '' ? params : false), ignoreServices);
    var licenseChange = sql.licenseChangeForActiveSubscriptions(startDate, endDate, (params != '' ? params : false), ignoreServices);
    var subscriptionChange = sql.licensechangeForSubscriptionChange(startDate, endDate, (params != '' ? params : false), ignoreServices);

    queryResultAsJSON({'new_subscription_license': queryFornewSubscription, 'active_subscription_license' : licenseChange, 'change_subscription_license' : subscriptionChange}, res);
});


//	============================================================================================

//	-----------------------------------------------------------------------------
//	Domain Details (products and licenses) of a selected domain
//	-----------------------------------------------------------------------------
app.post('/domain/*', function (req, res){
    logger.debug("Getting db information for domain information");
	var domain = req.body.domain;
	var cus_id = req.body.cus_id;
    var product_id = req.body.product_id;
	var start_date = req.body.start_date;
	var end_date = req.body.end_date;
	var salesPerson = req.body.salesperson_name;
	//
	var domainDetails = sql.domainDetails(domain);
	var subscriptions = sql.domainSubscriptions(cus_id ,start_date, end_date, product_id);
	var invoices = sql.domainInvoices(domain, start_date, end_date, salesPerson, product_id);
	queryResultAsJSON({domain: domainDetails, subscriptions: subscriptions, invoices: invoices}, res);
});

//	============================================================================================

//	-----------------------------------------------------------------------------
//	Connect a reseller admin account
//	-----------------------------------------------------------------------------
app.get('/connect*', function (req, res){
	var querystring = require('querystring');
	var qStr = querystring.parse(req.url.substring(req.url.indexOf('?')+1));
	//
	var googleAuth = require('google-auth-library');
	var auth = new googleAuth();
	var credentials = JSON.parse(fs.readFileSync('cert/client_secret_208891421206-gorc991b3t4go3bbm4ucic3ro4rv0gsg.apps.googleusercontent.com.json', 'utf8'));
	var oauth2Client = new auth.OAuth2(credentials.installed.client_id, credentials.installed.client_secret, config.google.redirectUri.replace('sign-in', 'connect'));//credentials.installed.redirect_uris[0]
	//
	if (typeof qStr.code != 'undefined'){
		oauth2Client.getToken(qStr.code,
			function (err, token){
				if (err)
					res.write('Error while trying to retrieve access token');
				else{
					var identity = eval('('+(new Buffer(token.id_token.split('.')[1], 'base64')).toString()+')');
					fs.writeFile(__dirname+'/.credentials/'+identity.email+'.token', JSON.stringify(token));
					req.session.message = {'level': 'success', 'message': 'Account '+identity.email+' is connected succesfully'};
					res.redirect('./#dashboard');
				}
			});
	}
	else if (typeof qStr.error != 'undefined'){
		res.write(qStr.error);
		res.end();
	}
	else{
		var authUrl = oauth2Client.generateAuthUrl({access_type: 'offline', scope: ['https://www.googleapis.com/auth/apps.order', 'https://www.googleapis.com/auth/userinfo.email']});
		res.redirect(authUrl);
	}
});


//	-----------------------------------------------------------------------------
//	User authentication against Google OAuth Endpoint
//	-----------------------------------------------------------------------------
app.get('/log-out', function (req, res){
	req.session.userid = null;
	res.redirect('/sign-in?message=Logged+out');
});

app.get('/sign-in*', function (req, res){
	if (req.url.indexOf('code') > -1){
		var http = require('https');
		var querystring = require('querystring');
		var qStr = querystring.parse(req.url.substring(req.url.indexOf('?')+1));
		if (qStr.state != req.session.gauthNonce)
			res.redirect('/sign-in?error=Unreliable+source');
		// Build the post string from an object
		var data = querystring.stringify({'code': qStr.code, 'client_id': config.google.clientId, 'client_secret': config.google.clientSecret, 'redirect_uri': config.google.redirectUri, 'grant_type': 'authorization_code'});
		// An object of options to indicate where to post
		var options = {host: 'www.googleapis.com', port: 443, path: '/oauth2/v4/token', method: 'POST', headers: {'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(data)}};
		// Set up http request
		var post = http.request(options,
			function(response){
				response.setEncoding('utf8');
				var completeResponse = '';
				response.on('data', function (chunk){
					completeResponse += chunk;
				});
				response.on('end', function (chunk){
					completeResponse = eval('('+completeResponse+')');
					if (typeof completeResponse.id_token == 'undefined')
						res.redirect('/sign-in?error=Unauthorized');
					else{
						req.session.gauthNonce = null;
						completeResponse.id_token = eval('('+(new Buffer(completeResponse.id_token.split('.')[1], 'base64')).toString()+')');
						req.session.userid = completeResponse;
						res.redirect('./dashboard');
					}
				});
			})
		.on('error',
			function(err){
				res.redirect('/sign-in?error=Auth+error');
			});
		// post the data
		post.write(data);
		post.end();
	}
	else if (req.url.indexOf('error') > -1 || req.url.indexOf('message') > -1){
		//res.redirect('/sign-in'+req.url.substring(req.url.indexOf('/', 2)));
		//console.log('Redirecting: /sign-in'+req.url.substring(req.url.indexOf('/', 2)));
		res.send(loadTemplatePart('sign-in.html'));
	}
	else{
		//	Send to Google OAuth endpoint
		req.session.gauthNonce = (Math.ceil(Math.random()*10000000000)).toString(32);
		var authURL = 'https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id='+config.google.clientId+'&redirect_uri='+config.google.redirectUri+'&scope='+config.google.scopes+'&state='+req.session.gauthNonce;
		res.redirect(authURL);
	}
	//res.send(loadTemplatePart('sign-in.html'));
});

//	-----------------------------------------------------------------------------
//	Deliver the base template of SPA
//	-----------------------------------------------------------------------------

app.get('*', function (req, res){
	if (typeof req.session.userid == 'undefined' || req.session.userid == null){
		res.redirect('/sign-in');
	} else {
		console.log(req.session.userid.id_token.hd);
		console.log("viwo test");
		console.log("viwo test2");
		console.log("email",req.session.userid.id_token.email);
		var allowed_domains = ['viwoinc.com', 'propelbusinesscapital.com', 'upcurvecloud.com','villvay.info'];
		var allowed_auth_emails = config.allowed_auth_emails;
		if (
			((allowed_domains.indexOf(req.session.userid.id_token.hd) != -1) &&
			(allowed_auth_emails.indexOf(req.session.userid.id_token.email) != -1))||
			(req.session.userid.id_token.email.indexOf(config.allowed_auth_domains) != -1)
		)
		{
			res.send(loadTemplatePart('base.html'));
		} else {
			res.redirect('/sign-in?error=Unauthorized');
		}
	}
});
//	============================================================================================

app.listen(config.listenPort, function () {
	console.log('ViWO Dashboard listening on port '+config.listenPort);
});

function loadTemplatePart(template){
	var fs = require('fs');
	try{
		return fs.readFileSync('./public/templates/'+template, 'utf8');
	}
	catch(e){
		return '';
	}
}

Date.prototype.sqlFormatted = function() {
	var yyyy = this.getFullYear().toString();
	var mm = (this.getMonth()+1).toString();
	var dd  = this.getDate().toString();
	return yyyy +'-'+ (mm[1]?mm:"0"+mm[0]) +'-'+ (dd[1]?dd:"0"+dd[0]);
};

Date.prototype.sqlFormattedTime = function() {
	var hr = this.getHours().toString();
	if(!hr[1]) hr = "0"+hr[0];

	var min = this.getMinutes().toString();
	if(!min[1]) min = "0"+min[0];

	var sec = this.getSeconds().toString();
	if(!sec[1]) sec = "0"+sec[0];

	return hr+':'+min+':'+sec;
};


//	-----------------------------------------------------------------------------
//  Synchronize DB every 3 hrs
//	-----------------------------------------------------------------------------
var zohoSubscriptionSync = function() {
    logger.debug("Sysnchronization the databases using the cron");
    var cron = require('./cron');

    var processDate = new Date();
    cron.cron_id = Date.now();
    var start_time = new Date(cron.cron_id);

        // Check if next cron is within 15 minutes before or after now


            // Zoho Accounts
            logger.debug('\n--------Zoho Accounts--------\n');
            processDate.setHours(processDate.getHours()-5); // sync changes since 5 hour ago... fetching one extra hour to make sure we dont miss any data


            new cron.processZohoSubscription(connection, config, processDate.sqlFormatted(), processDate.sqlFormattedTime(), 1);
            new cron.updateCancelSubscription(connection, config, processDate.sqlFormatted(), processDate.sqlFormattedTime())

};

var customerWiseSubscriptionCount = function() {
    console.log("update the subscription order");

    connection.query(
        'SELECT id FROM customer',
        function (err,  rows, fields) {

            if (err) {
                console.log("error occured in fetching subscriptions");
                console.log(err);
            } else if (rows.length > 0 ) {

                for (var i = 0; i < rows.length; i++)
                {
                    var id = rows[i].id;
                    connection.query(
                        'SELECT su.id, created_on, se.code FROM subscription su left join service se on su.service_id = se.id where cus_id = ? and se.ignore_service = ? ;',
                        [id, 0],
                        function (err,  rows, fields) {

                            if (err) {
                                console.log(err);
                            } else if (rows.length > 0 ) {

                                for (var subsNo = 0; subsNo < rows.length; subsNo++){
                                    var previousPlan = 'no_previous';
                                    if(subsNo > 0){
                                        previousPlan = rows[subsNo-1].code;
                                    }
                                    updateSubscriptionOrder(rows[subsNo], subsNo + 1 ,previousPlan)
								}
                            }
                        }

                    );
                }
            }
        }

    );


};

var updateSubscriptionOrder = function (row, order, previousPlan) {
    connection.query(
        'UPDATE subscription SET subscription_no = ?, previous_plan = ? WHERE id = ?', [order , previousPlan,  row.id], function(err, result){
        	if(err){
        		console.log(err);
			}
		});

};
var executeSync = function() {
	logger.debug("Sysnchronization the databases using the cron");
    var cron = require('./cron');

    var processDate = new Date();
    var crm_done = false, books_done = false, viwopanel_done = false, viruswoman_done = false, subscriptionDone = false;
    cron.cron_id = Date.now();
    var start_time = new Date(cron.cron_id);

    connection.query('SELECT * FROM http_requests WHERE cron_id = (SELECT MAX(cron_id) FROM http_requests WHERE api_source != "zoho_books_fetch_all")', function (err, rows, fields) {
        // Check if next cron is within 15 minutes before or after now
        if(rows.length > 0) var nextCron = rows[0].cron_id + (1000*60*60*4);
        if(rows.length == 0 || nextCron <= Date.now()){
            // Zoho Accounts
            logger.debug('\n--------Zoho Accounts--------\n');
            processDate.setHours(processDate.getHours()-5); // sync changes since 5 hour ago... fetching one extra hour to make sure we dont miss any data

            // ZohoCRM
            connection.query(
                'INSERT INTO http_requests SET ?',
                {cron_id: cron.cron_id, request_count: 0, cron_start_time: start_time.sqlFormatted()+" "+start_time.sqlFormattedTime(), api_source: 'zoho_crm'},
                function(err, rows, fields){
                    new cron.processZohoCRM(connection, 1, 200, config, processDate.sqlFormatted(), processDate.sqlFormattedTime(), function(data){
                        crm_done = true;
                    });
                }
            );

            // Zohobooks
            connection.query(
                'INSERT INTO http_requests SET ?',
                {cron_id: cron.cron_id, request_count: 0, cron_start_time: start_time.sqlFormatted()+" "+start_time.sqlFormattedTime(), api_source: 'zoho_books'},
                function(err, rows, fields){
                    new cron.processZohoBooks(connection, config, processDate.sqlFormatted(), processDate.sqlFormattedTime(), 1, function(data, done){
                        books_done = done;
                    });
                }
            );

            // Viwopanel
            connection.query(
                'INSERT INTO http_requests SET ?',
                {cron_id: cron.cron_id, request_count: 0, cron_start_time: start_time.sqlFormatted()+" "+start_time.sqlFormattedTime(), api_source: 'reseller.viwopanel.com'},
                function(err, rows, fields){
                    new cron.process('zoho_admin@reseller.viwopanel.com', connection, config, processDate.sqlFormatted(), processDate.sqlFormattedTime(), false, function(data){
                        viwopanel_done = true;
                    });
                }
            );

            // Viruswoman
            connection.query(
                'INSERT INTO http_requests SET ?',
                {cron_id: cron.cron_id, request_count: 0, cron_start_time: start_time.sqlFormatted()+" "+start_time.sqlFormattedTime(), api_source: 'reseller.viruswoman.com'},
                function(err, rows, fields){
                    new cron.process('zoho_admin@reseller.viruswoman.com', connection, config, processDate.sqlFormatted(), processDate.sqlFormattedTime(), false, function(data){
                        viruswoman_done = true;
                    });
                }
            );

            // new cron.processZohoSubscription(connection, config, processDate.sqlFormatted(), processDate.sqlFormattedTime(), 1);


            var done_check = setInterval(function () {
                if(crm_done && books_done && viwopanel_done && viruswoman_done){
                    clearInterval(done_check);
                    logger.debug('--------Syncing Completed--------\n');
                    console.log(new Date().toISOString());
                }
            }, 1000);
        }
    });
};

if(typeof config.runCron != "undefined" && config.runCron) {
    var syncTimer = setInterval(function () {
        new executeSync();
    }, 1000 * 60 * 60 * 24); // one day

    setInterval(function () {
        new zohoSubscriptionSync();
    }, 1000 * 60 * 60 * 30); // one day

    setInterval(function () {
        new customerWiseSubscriptionCount();
    }, 1000 * 60 * 60 * 27); // one day
    // Run first sync inside timeout to make it async
    // setTimeout(function () {
    //     new executeSync();
    // }, 500);
    // setTimeout(function () {
    //     new zohoSubscriptionSync();
    // }, 500);
    setTimeout(function () {
        new customerWiseSubscriptionCount();
    }, 500);
}

//	-----------------------------------------------------------------------------
//  Synchronize DB Manually
//


var manualSyncForSubscriptionConsole = function(res, callback) {
	logger.debug("Manual synchronization starting");
    var cron = require('./cron');

    var processDate = new Date();
    var viwopanel_done = false;
    var	viruswoman_done = false;
    cron.cron_id = Date.now();
    var start_time = new Date(cron.cron_id);

        // Check if next cron is within 15 minutes before or after now
        //if(rows.length > 0) var nextCron = rows[0].cron_id + (1000*60*60*4);
            // Zoho Accounts
            logger.debug('\n--------Zoho Accounts--------\n');
            processDate.setHours(processDate.getHours()-5); // sync changes since 5 hour ago... fetching one extra hour to make sure we dont miss any data

		// Viwopanel

		connection.query(
			'UPDATE panel_metadata SET manual_update = ? ', ['Yes'],
			function(err, rows, fields){
                logger.error("error in query " + err);
			}
		);
		connection.query(
			'INSERT INTO http_requests SET ?',
			{cron_id: cron.cron_id, request_count: 0, cron_start_time: start_time.sqlFormatted()+" "+start_time.sqlFormattedTime(), api_source: 'reseller.viwopanel.com'},
			function(err, rows, fields){
				new cron.process('zoho_admin@reseller.viwopanel.com', connection, config, processDate.sqlFormatted(), processDate.sqlFormattedTime(), true, function(data){
					viwopanel_done = true;
				});
			}
		);

    // Viruswoman
		connection.query(
			'INSERT INTO http_requests SET ?',
			{cron_id: cron.cron_id, request_count: 0, cron_start_time: start_time.sqlFormatted()+" "+start_time.sqlFormattedTime(), api_source: 'reseller.viruswoman.com'},
			function(err, rows, fields){
				new cron.process('zoho_admin@reseller.viruswoman.com', connection, config, processDate.sqlFormatted(), processDate.sqlFormattedTime(), true, function(data){
					viruswoman_done = true;
				});
			}
		);
};
