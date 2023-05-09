
function initialize(){

	var main = document.getElementById('main');
	var loader = document.getElementById('loader');
	var zohoAdmins = {'reseller.viruswoman.com': 'ViWO Original', 'reseller.viwopanel.com': 'ViWO Premium'};

	var bindTemplates = function(templates){
		//
		//	========================================================================
		//	Dashboard
		//	========================================================================
		//	Prepare template reagents
		var yesterdayRow = arcRead(templates['dashboard'].q('table.responsive-table tbody tr')[0]);
		//
		new navFrame('dashboard', templates['dashboard'],
			function(context, params){
				var d = new Date();
				d.setDate(d.getDate()-1);
				var rev_date = new Date();
				rev_date.setDate(rev_date.getDate()-1);
				var tbody = context.q('table.responsive-table tbody')[0];
				tbody.innerHTML = loader.innerHTML;
				new ajax('/day-summery/'+d.getFullYear()+'/'+(d.getMonth()+1)+'/'+d.getDate(), {
						callback: function(data){
							tbody.innerHTML = '';
							var accounts = eval('('+data.responseText+')');
							for (var account in accounts){
								var data = accounts[account];
								var tmpTr;
								for (var i = 0; i < data.length; i++)
									if (data[i].seats > 0){
										data[i].account = zohoAdmins[account];//.split('.')[1]
										data[i].statusKey = data[i].new_status;
										data[i].seatsKey = data[i].seats;
										if (data[i].prev_status != data[i].new_status){
											if (data[i].prev_status == null)
												data[i].status = '<i class="material-icons new">fiber_new</i> '+data[i].new_status;
											else
												data[i].status = '<small>'+data[i].prev_status+' <i class="material-icons">trending_flat</i> </small>'+data[i].new_status;		//	">trending_flat
										}
										else
											data[i].status = data[i].prev_status;
										if (data[i].prev_seats != data[i].seats){
											if (data[i].prev_seats == null)
												data[i].seats = '<i class="material-icons new">fiber_new</i> '+data[i].seats;
											else
												data[i].seats = '<small>'+data[i].prev_seats+' <i class="material-icons text-'+(data[i].prev_seats < data[i].seats ? 'green">trending_up' : 'red">trending_down')+'</i> </small>'+data[i].seats;
										}
										data[i].plan = data[i].plan.replace(/_/g, ' ');
										data[i].code = data[i].code.replace(/-/g, ' ');
										data[i].href = '#domain/'+data[i].cus_id+'/'+data[i].domain;
										tmpTr = tbody.appendChild(arcReact(data[i], yesterdayRow));
										//tmpTr.ondblclick = function(){document.location.href = this.getAttribute('data-href');};
									}
							}
						}
					});
				//
				//	Get Total License data from server
				new ajax('/total-licenses-all-plans/'+d.getFullYear()+'/'+(d.getMonth()+1), {
						callback: function(data){
							var accounts = eval('('+data.responseText+')');
							for (var account in accounts){
								var data = accounts[account];
								var chartData = [['Product', 'Licenses']], chartColors = [];
								//
								//	Iterate for all total license counts
								for (var i = 0; i < data.length; i++){
									data[i].code = data[i].code.replace(/-/g, ' ');
									//
									chartData.push([data[i].code, data[i].licenses]);
									chartColors.push(data[i].color);
								}
								new drawChart(chartData, context.q('#total-licenses #'+account.replace(/\./g, '-'))[0], 'total-license-dashboard-pie', chartColors, false, zohoAdmins[account]);
							}
							//
							var d = (new Date()).toString().split(' ');
							context.q('#total-licenses')[0].parentNode.q('span.card-title')[0].innerHTML = 'License Count by Product ['+d[1]+' '+d[3]+']';
						}
					});
				//
				context.q('#license-change')[0].innerHTML = loader.innerHTML;
				var chartValues = [['Date', zohoAdmins['reseller.viruswoman.com'], zohoAdmins['reseller.viwopanel.com']]], date;
				var regressLicesnseCount = function(d, offset, limit){
					if (offset == limit)
						return false;
					d.setMonth(d.getMonth()+1);
					new ajax('/license-count/'+d.getFullYear()+'/'+(d.getMonth()+1), {
							cache: offset < limit-1,
							callback: function(data){
								data = eval('('+data.responseText+')');
								/*for (var i = 0; i < data.length; i++){//zohoAdmins
									//date = new Date(data[i].year, data[i].month, '01');
									chartValues.push([new Date(d), data[i].licenses]);
								}*/
								chartValues.push([new Date(d), data['reseller.viruswoman.com'][0].licenses, data['reseller.viwopanel.com'][0].licenses]);
								new drawChart(chartValues, context.q('#license-change')[0], 'total-licenses-per-month');
								regressLicesnseCount(d, offset+1, limit);
							}
						});
				};
				d = new Date(d.getFullYear(), d.getMonth());
				d.setMonth(d.getMonth() - 11);
				setTimeout(
					function(){
						regressLicesnseCount(d, 0, 11);
					}, 100);
			});
		//
		//	========================================================================
		//	Total Licenses
		//	========================================================================
		new navFrame('total-licenses', templates['total-licenses'],
			function(context, params){
				fillMonthStatsBySKU(context, params, totLicenseParentNode, 'total-licenses', 'Total Licenses', '', '');
			});
		//
		//	========================================================================
		//	New Subscriptions
		//	========================================================================
		var newSubscriptionsParentNode = templates['new-subscriptions'].q('table.responsive-table')[0].parentNode.parentNode;
		new navFrame('new-subscriptions', templates['new-subscriptions'],
			function(context, params){
				fillMonthStatsBySKU(context, params, newSubscriptionsParentNode, 'new-subscriptions', 'New Subscriptions', '+', '+');
			});
		//
		//	========================================================================
		//	By Salesperson
		//	========================================================================
		var bySalespersonParentNode = templates['by-salesperson'].q('table.responsive-table')[0].parentNode.parentNode;
		new navFrame('by-salesperson', templates['by-salesperson'],
			function(context, params){
				fillMonthStatsByUsername(context, params, bySalespersonParentNode, 'by-salesperson', 'By Salesperson', '+', '+');
			});
		var revBySalespersonParentNode = templates['rev-by-salesperson'].q('table.responsive-table')[0].parentNode.parentNode;
		new navFrame('revenue-by-salesperson', templates['rev-by-salesperson'],
			function(context, params){
				fillRevStatsByUsername(context, params, revBySalespersonParentNode, 'revenue-by-salesperson', 'Revenue By Salesperson', '+', '+');
			});
		//
		//	========================================================================
		//	By Lead Source
		//	========================================================================
		var byLeadSourceParentNode = templates['by-lead-source'].q('table.responsive-table')[0].parentNode.parentNode;
		new navFrame('by-lead-source', templates['by-lead-source'],
			function(context, params){
				fillMonthStatsByLeadSource(context, params, byLeadSourceParentNode, 'by-lead-source', 'By Lead Source', '+', '+');
			});
		var revByLeadSourceParentNode = templates['rev-by-lead-source'].q('table.responsive-table')[0].parentNode.parentNode;
		new navFrame('revenue-by-lead-source', templates['rev-by-lead-source'],
			function(context, params){
				fillRevStatsByUsername(context, params, revByLeadSourceParentNode, 'revenue-by-lead-source', 'Revenue By Lead Source', '+', '+');
			});
		//
		//	========================================================================
		//	Lost Subscriptions
		//	========================================================================
		var lostSubscriptionsParentNode = templates['lost-subscriptions'].q('table.responsive-table')[0].parentNode.parentNode;
		new navFrame('lost-subscriptions', templates['lost-subscriptions'],
			function(context, params){
				fillMonthStatsBySKU(context, params, lostSubscriptionsParentNode, 'lost-subscriptions', 'Lost Subscriptions', '-', '-');
			});
		//
		//	========================================================================
		//	New AUR
		//	========================================================================
		var newAURParentNode = templates['new-aur'].q('table.responsive-table')[0].parentNode.parentNode;
		new navFrame('new-aur', templates['new-aur'],
			function(context, params){
				fillMonthStatsBySKU(context, params, newAURParentNode, 'new-aur', 'New AUR', '', '+');
			});
		//
		//	========================================================================
		//	Lost AUR
		//	========================================================================
		var lostAURParentNode = templates['lost-aur'].q('table.responsive-table')[0].parentNode.parentNode;
		new navFrame('lost-aur', templates['lost-aur'],
			function(context, params){
				fillMonthStatsBySKU(context, params, lostAURParentNode, 'lost-aur', 'Lost AUR', '', '-');
			});
		//
		//	========================================================================
		//	Total Revenue
		//	========================================================================
		//	Prepare template reagents
//		var revTrTemplate = {tr: {content: [ {td: {}}, {td: {class: 'numeric'}} ]}};
//		revTrTemplate = [revTrTemplate, {month: [revTrTemplate.tr.content[0].td, 'content'], revenue: [revTrTemplate.tr.content[1].td, 'content']}];
//		//
//		new navFrame('total-revenue', templates['total-revenue'], function(context, params){
//                var rev_date = new Date();
//			rev_date.setDate(rev_date.getDate()-1);
//			var revTbody = context.q('#rev-tbody tbody')[0];
//			revTbody.innerHTML = '';
//			context.q('#revenue-change')[0].innerHTML = loader.innerHTML;
//			var revChartValues = [['Date', zohoAdmins['reseller.viruswoman.com']]];
//			var RegressRevenueCount = function(d, offset, limit){
//				if (offset == limit)
//					return false;
//				d.setMonth(d.getMonth()+1);
//				new ajax('/revenue-count/'+d.getFullYear()+'/'+(d.getMonth()+1), {
//					cache: offset < limit-1,
//					callback: function(data){
//						data = eval('('+data.responseText+')');
//						//
//						revChartValues.push([new Date(d), Math.round(data['result'][0].revenue)]);
//						var date = d.toString().split(' ')[1] + ' ' + d.toString().split(' ')[3];
//						revTbody.appendChild(arcReact({month: date, revenue: formatDollarAmount(data['result'][0].revenue)}, revTrTemplate));
//						//
//						new drawChart(revChartValues, context.q('#revenue-change')[0], 'total-revenue-per-month');
//						RegressRevenueCount(d, offset+1, limit);
//					}
//				});
//			};
//			rev_date = new Date(rev_date.getFullYear(), rev_date.getMonth());
//			rev_date.setMonth(rev_date.getMonth() - 11);
//			setTimeout(function(){
//				RegressRevenueCount(rev_date, 0, 11);
//			}, 100);
//		});



		/*var totalRevenueParentNode = templates['total-revenue'].q('table.responsive-table')[0].parentNode.parentNode;
		new navFrame('total-revenue', templates['total-revenue'],
			function(context, params){
				//fillMonthStatsBySKU(context, params, totalRevenueParentNode, 'total-revenue', 'Total Revenue', '', '-');
			});*/
		//
		//	========================================================================
		//	Details (Domains for a selected SKU for a given period)
		//	If it is customers details of a selected SKU - display in details template
		//	========================================================================
		//	Prepare template reagents
		var detailsTable = templates['details'].q('table.responsive-table tbody')[0];//.parentNode.innerHTML;
		var detailsRow = detailsTable.q('tr')[0];
		detailsRow = arcRead(detailsRow.parentNode.removeChild(detailsRow));
		//var lostAURParentNode = templates['lost-aur'].q('table.responsive-table')[0].parentNode.parentNode;
		new navFrame('details', templates['details'],
			function(context, params){
				//	If year/month is given use it, or get current year/month
				if (params.length == 2)
					var d = new Date(params[0], params[1]-1);
				else
					var d = new Date();
				//
				detailsTable.innerHTML = loader.innerHTML;
				//
				context.q('#year-month')[0].innerHTML = d.toString().split(' ')[1] + ' ' + d.toString().split(' ')[3];
				context.q('#title')[0].innerHTML = lastReportTitle;
				context.q('#subtitle')[0].innerHTML = (params.length == 5 ? params[4].replace(/-/g, ' ') + ' - ' : '') + params[3].replace(/_/g, ' ');
				//
				//	Get customer details for the selected SKU for given period
				new ajax('/'+params[0]+'/'+d.getFullYear()+'/'+(d.getMonth()+1)+'/'+params[3]+'/'+params[4], {
						callback: function(data){
							detailsTable.innerHTML = '';
							var accounts = eval('('+data.responseText+')'), tmpTr;
							for (var account in accounts)
								for (var i = 0; i < accounts[account].length; i++){
									accounts[account][i].account = zohoAdmins[account];
									accounts[account][i].href = '#domain/'+accounts[account][i].id+'/'+accounts[account][i].domain;
									accounts[account][i].licenses = lastReportNumPfx2+accounts[account][i].licenses;
									tmpTr = detailsTable.appendChild(arcReact(accounts[account][i], detailsRow));
									//tmpTr.ondblclick = function(){document.location.href = this.getAttribute('data-href');};
								}
							//console.log(accounts);
						}
					});
			});//q('#popup')[0]
		//
		//	========================================================================
		//	Details (products and licenses) of a selected domain
		//	========================================================================
		//	Prepare template reagents
		var domainTables = templates['domain'].q('table.responsive-table');
		var domainDetailsTable = domainTables[0].q('tbody')[0];
		var domainDetailsTemplate = arcRead(domainDetailsTable.parentNode.removeChild(domainDetailsTable));
		//
		var licenseChangeTable = domainTables[1].parentNode;
		var licenseChangeParentNode = licenseChangeTable.parentNode;
		licenseChangeTable = licenseChangeTable.parentNode.removeChild(licenseChangeTable);
		var licenseChangeRow = licenseChangeTable.q('tbody tr')[0];
		licenseChangeRow = arcRead(licenseChangeRow.parentNode.removeChild(licenseChangeRow));
		licenseChangeTable = arcRead(licenseChangeTable);
		var lastReportTitle = '', lastReportNumPfx2 = '';
		//
		var invoicesTable = domainTables[2].q('tbody')[0];
		var invoicesRow = invoicesTable.q('tr')[0];
		invoicesRow = arcRead(invoicesRow.parentNode.removeChild(invoicesRow));
		//
		new navFrame('domain', templates['domain'],
			function(context, params){
				licenseChangeParentNode.innerHTML = '<span class="card-title" id="domain-name">Subscriptions</span>';
				invoicesTable.innerHTML = '';
				domainTables[0].innerHTML = '';
				//pNode.innerHTML = loader.innerHTML;
				//
				//	Get domain products and licenses details
				new ajax('/domain/'+params[0]+'/'+params[1], {
						callback: function(data){
							data = eval('('+data.responseText+')');
							subscriptions = data['subscriptions'];
							invoices = data['invoices'];
							//
							domainTables[0].appendChild(arcReact(data['domain'][0], domainDetailsTemplate));
							domainTables[0].parentNode.q('#domain-name')[0].innerHTML = data['domain'][0].name;
							//if (data.length == 0)return true;, prevEndDate = data[0].end_date
							var prevProduct = false, Sig = '', PSig = '-';
							for (var i = 0; i < subscriptions.length; i++){
								if (prevProduct != subscriptions[i].code+subscriptions[i].plan){
									prevProduct = subscriptions[i].code+subscriptions[i].plan;
									subscriptions[i].plan = subscriptions[i].plan.replace(/_/g, ' ');
									subscriptions[i].code = subscriptions[i].code.replace(/-/g, ' ');
									tbody = licenseChangeParentNode.appendChild(arcReact({plan: subscriptions[i].code+' - ['+subscriptions[i].plan+'] from '+zohoAdmins[subscriptions[i].zoho_admin]}, licenseChangeTable)).q('tbody')[0];
								}
								subscriptions[i].event_time = subscriptions[i].event_time.substring(0, 10);
								subscriptions[i].start_date = subscriptions[i].start_date.substring(0, 10);
								subscriptions[i].end_date = subscriptions[i].end_date.substring(0, 10);
								if (subscriptions[i].start_date == '0000-00-00')
									subscriptions[i].start_date = 'N/A';
								if (subscriptions[i].end_date == '0000-00-00')
									subscriptions[i].end_date = 'N/A';
								Sig = prevProduct+':'+subscriptions[i].start_date+':'+subscriptions[i].end_date+':'+subscriptions[i].new_status+':'+subscriptions[i].seats;
								if (PSig == Sig)
									console.log('Duplicate Subscription Event - ID: '+subscriptions[i].event_time+' > '+subscriptions[i].id);
								else
									tbody.appendChild(arcReact(subscriptions[i], licenseChangeRow));
								PSig = Sig;
							}
							//
							for (var i = 0; i < invoices.length; i++){
								invoices[i].date = (new Date(invoices[i].date)).toString().substring(0, 15);
								invoices[i].total = formatDollarAmount(invoices[i].total);
								invoicesTable.appendChild(arcReact(invoices[i], invoicesRow));
							}
						}
					});
			});

		//	===========================================================================================================
		//	===========================================================================================================
		//	===========================================================================================================

		//	Prepare template reagents
		var totLicenseTable = templates['total-licenses'].q('table.responsive-table')[0].parentNode;//.innerHTML;
		var totLicenseParentNode = totLicenseTable.parentNode;
		totLicenseTable = totLicenseTable.parentNode.removeChild(totLicenseTable);
		var totLicenseRow = totLicenseTable.q('tbody tr')[0];
		totLicenseRow = arcRead(totLicenseRow.parentNode.removeChild(totLicenseRow));
		totLicenseTable = arcRead(totLicenseTable);
		var totLicenseParentNodeDefaultHTML = totLicenseParentNode.innerHTML;
		var tFootTemplate = {tfoot: {content: {tr: {content: [
													{td: {content: 'Total', colspan: 2}},
													{td: {class: 'numeric', content: '0'}},
													{td: {class: 'numeric', content: '0'}},
													{td: {class: 'numeric', content: '0'}},
													{td: {class: 'numeric', content: '0'}}
												]}}}};
		tFootTemplate = [tFootTemplate, {totSubs1: [tFootTemplate.tfoot.content.tr.content[1].td, 'content'], totLicns1: [tFootTemplate.tfoot.content.tr.content[2].td, 'content'],
									totSubs2: [tFootTemplate.tfoot.content.tr.content[3].td, 'content'], totLicns2: [tFootTemplate.tfoot.content.tr.content[4].td, 'content']}];

		//	Retrieve stats of a given type for a given month and fill the template
		function fillMonthStatsBySKU(context, params, pNode, slug, title, numPfx1, numPfx2){
			//	If year/month/date is given use it, or get current year/month/date
			if (params.length == 3)
				var d = new Date(params[0], params[1]-1, params[2]);
			else
				var d = new Date();
			//
			pNode.innerHTML = loader.innerHTML;//totLicenseParentNodeDefaultHTML;

            if (slug == 'total-licenses') {
                context.q('#startId')[0].style.display = 'none';
                if (context.q('#end_date')[0].valueAsDate == null) {
                    context.q('#end_date')[0].valueAsDate = new Date();
                }
                context.q('#end_date')[0].onchange = function () {
                    if (context.q('#end_date')[0].valueAsDate == null) {
                        context.q('#end_date')[0].valueAsDate = new Date();
                        var date = this.value.split('-');
                        document.location.hash = slug + '/' + date[0] + '/' + date[1] + '/' + date[2];
                    }
                    else {
                        var date = this.value.split('-');
                        document.location.hash = slug + '/' + date[0] + '/' + date[1] + '/' + date[2];
                    }
                };
            }

            // var endDate = $("#end_date").val();
            // $("#end_date").onchange(this.value)

			// var months = context.q('ul.months')[0], month = new Date(), monthStr = '';
			// months.innerHTML = '';
			// month.setMonth(month.getMonth()-12);
			// for (var i = 0; i < 12; i++){
			// 	month.setMonth(month.getMonth()+1);
			// 	monthStr = month.toString().split(' ');
			// 	months.appendChild(elem('li', '<a href="#'+slug+'/'+month.getFullYear()+'/'+(month.getMonth()+1)+'">'+monthStr[1]+' '+monthStr[3]+'</a>'));
			// }
			//
			//	Reset / Clean-up the template to fill data
			var statsCounters = context.q('.stats-counter .counter');
			statsCounters[0].innerHTML = '';
			statsCounters[1].innerHTML = '';
			statsCounters[2].innerHTML = '';
			statsCounters[3].innerHTML = '';
			//
			//	Get stats of given type from server
			new ajax('/'+slug+'/'+d.getFullYear()+'/'+(d.getMonth()+1)+'/'+d.getDate(), {//+(params.length == 4 ? '/'+params[2]+'/'+params[3] : '')
					callback: function(data){
						pNode.innerHTML = totLicenseParentNodeDefaultHTML;
						//
						//	Set current year/month to card title
						var cardTitle = context.q('.card-title');
						cardTitle[0].innerHTML = d.toString().split(' ')[1] + ' ' + d.toString().split(' ')[3];
						cardTitle[1].innerHTML = title;
						lastReportTitle = title;
						lastReportNumPfx2 = numPfx2;
						//
						var accounts = eval('('+data.responseText+')');
						//	First let's index data to make a set union between VirusWoman and ViWO Premium
						var data = {};
						for (var account in accounts)
							for (var i = 0; i < accounts[account].length; i++){
								if (typeof data[accounts[account][i].plan] == 'undefined')
									data[accounts[account][i].plan] = {};
								if (typeof data[accounts[account][i].plan][accounts[account][i].code] == 'undefined')
									data[accounts[account][i].plan][accounts[account][i].code] = {color: accounts[account][i].color};
								data[accounts[account][i].plan][accounts[account][i].code][account] = {subscriptions: accounts[account][i].subscriptions, licenses: accounts[account][i].licenses};
							}
						var totalSubscriptions = [0, 0, 0], totalLicenses = [0, 0, 0];
						//	Now, generate tables and make reports from that
						for (var plan in data){
							//
							//	Create seperate tables for subscriptions under different plans
							var tbody = pNode.appendChild(arcReact({plan: plan.replace(/_/g, ' ')}, totLicenseTable)).q('tbody')[0];
							var subTotalSubscriptions = [0, 0, 0], subTotalLicenses = [0, 0, 0];
							var chartData = [ '', [['Product', 'Licenses']], [['Product', 'Licenses']] ], chartColors = [ '', [], [] ];
							//
							for (var code in data[plan]){
								var i = 1, rec = {plan: plan.replace(/_/g, ' '), code: code.replace(/-/g, ' ')};
								for (var account in zohoAdmins){
									rec.color = 'background-color:#'+data[plan][code].color+';';
									if (typeof data[plan][code][account] != 'undefined'){
										rec['subscriptions'+i] = numPfx1+data[plan][code][account].subscriptions.toLocaleString();
										rec['licenses'+i] = numPfx2+data[plan][code][account].licenses.toLocaleString();
										//
										//	Count the total number of subscriptions and licenses
										subTotalSubscriptions[i] += data[plan][code][account].subscriptions;
										subTotalLicenses[i] += data[plan][code][account].licenses;
										//
										//	Prepare data for charts
										chartData[i].push([code, data[plan][code][account].licenses]);
										chartColors[i].push(data[plan][code].color);
									}
									else{
										chartData[i].push([code, 0]);
										chartColors[i].push(data[plan][code].color);
									}
									i += 1;
								}
								rec.anchor = '#details/'+slug+'/'+d.getFullYear()+'/'+(d.getMonth()+1)+'/'+plan+'/'+code;
								//	Add a row to a table
								tbody.appendChild(arcReact(rec, totLicenseRow));
							}
							//	Add subtotal row for subscriptions under a plan
							tbody.parentNode.appendChild(arcReact({totSubs1: numPfx1+subTotalSubscriptions[1].toLocaleString(), totLicns1: numPfx2+subTotalLicenses[1].toLocaleString(),
																totSubs2: numPfx1+subTotalSubscriptions[2].toLocaleString(), totLicns2: numPfx2+subTotalLicenses[2].toLocaleString()}, tFootTemplate));
							totalSubscriptions[1] += subTotalSubscriptions[1];
							totalSubscriptions[2] += subTotalSubscriptions[2];
							totalLicenses[1] += subTotalLicenses[1];
							totalLicenses[2] += subTotalLicenses[2];
							sorttable.makeSortable(tbody.parentNode);
							//
							//	Draw chart for subscriptions under the plan
							if (subTotalLicenses[1] > 0)
								new drawChart(chartData[1], tbody.parentNode.parentNode.q('.chart')[0], 'total-license-products-pie', chartColors[1], tbody);
							if (subTotalLicenses[2] > 0)
								new drawChart(chartData[2], tbody.parentNode.parentNode.q('.chart')[1], 'total-license-products-pie', chartColors[2], tbody);
						}
						//
						//	Display the total number of subscriptions and licenses
						statsCounters[0].innerHTML = numPfx1+totalSubscriptions[1].toLocaleString();
						statsCounters[1].innerHTML = numPfx2+totalLicenses[1].toLocaleString();
						statsCounters[2].innerHTML = numPfx1+totalSubscriptions[2].toLocaleString();
						statsCounters[3].innerHTML = numPfx2+totalLicenses[2].toLocaleString();
					}
				});
		}

		//	===========================================================================================================
		//	===========================================================================================================
		//	===========================================================================================================

		//	Prepare template reagents
		var totLicenseByLeadSourceTable = templates['by-lead-source'].q('table.responsive-table')[0].parentNode;//.innerHTML;
		var totLicenseByLeadSourceTableParentNode = totLicenseByLeadSourceTable.parentNode;
		totLicenseByLeadSourceTable = totLicenseByLeadSourceTable.parentNode.removeChild(totLicenseByLeadSourceTable);
		var totLicenseByLeadSourceRow = totLicenseByLeadSourceTable.q('tbody tr')[0];
		totLicenseByLeadSourceRow = arcRead(totLicenseByLeadSourceRow.parentNode.removeChild(totLicenseByLeadSourceRow));
		totLicenseByLeadSourceTable = arcRead(totLicenseByLeadSourceTable);
		var totLicenseByLeadSourceParentNodeDefaultHTML = totLicenseByLeadSourceTableParentNode.innerHTML;
		var tFootByLeadSourceTemplate = {tfoot: {content: {tr: {content: [
													{td: {content: 'Total'}},
													{td: {class: 'numeric', content: '0'}},
													{td: {class: 'numeric', content: '0'}},
													{td: {class: 'numeric', content: '0'}},
													{td: {class: 'numeric', content: '0'}}
												]}}}};
		tFootByLeadSourceTemplate = [tFootByLeadSourceTemplate, {totSubs1: [tFootByLeadSourceTemplate.tfoot.content.tr.content[1].td, 'content'], totLicns1: [tFootByLeadSourceTemplate.tfoot.content.tr.content[2].td, 'content'],
															totSubs2: [tFootByLeadSourceTemplate.tfoot.content.tr.content[3].td, 'content'], totLicns2: [tFootByLeadSourceTemplate.tfoot.content.tr.content[4].td, 'content']}];
		//
		//	Retrieve stats of a given type for a given month and fill the template
		function fillMonthStatsByLeadSource(context, params, pNode, slug, title, numPfx1, numPfx2){
			pNode.innerHTML = loader.innerHTML;//totLicenseParentNodeDefaultHTML;
			//	If year/month is given use it, or get current year/month
			if (params.length == 2)
				var d = new Date(params[0], params[1]-1);
			else
				var d = new Date();
			//
			//	Fill months list
			var months = context.q('ul.months')[0], month = new Date(), monthStr = '';
			months.innerHTML = '';
			month.setMonth(month.getMonth()-12);
			for (var i = 0; i < 12; i++){
				month.setMonth(month.getMonth()+1);
				monthStr = month.toString().split(' ');
				months.appendChild(elem('li', '<a href="#'+slug+'/'+month.getFullYear()+'/'+(month.getMonth()+1)+'">'+monthStr[1]+' '+monthStr[3]+'</a>'));
			}
			//
			//	Reset / Clean-up the template to fill data
			var statsCounters = context.q('.stats-counter .counter');
			statsCounters[0].innerHTML = '';
			statsCounters[1].innerHTML = '';
			statsCounters[2].innerHTML = '';
			statsCounters[3].innerHTML = '';
			//
			//	Get stats of given type from server
			new ajax('/'+slug+'/'+d.getFullYear()+'/'+(d.getMonth()+1), {
					callback: function(data){
						pNode.innerHTML = totLicenseByLeadSourceParentNodeDefaultHTML;
						//
						//	Set current year/month to card title
						var cardTitle = context.q('.card-title');
						cardTitle[0].innerHTML = d.toString().split(' ')[1] + ' ' + d.toString().split(' ')[3];
						cardTitle[1].innerHTML = title;
						lastReportTitle = title;
						lastReportNumPfx2 = numPfx2;
						//
						var accounts = eval('('+data.responseText+')');
						//	First let's index data to make a set union between VirusWoman and ViWO Premium
						var data = {};
						for (var account in accounts)
							for (var i = 0; i < accounts[account].length; i++){
								if (typeof data[accounts[account][i].id] == 'undefined')
									data[accounts[account][i].id] = {description: accounts[account][i].description};
								data[accounts[account][i].id][account] = {subscriptions: accounts[account][i].subscriptions, licenses: accounts[account][i].licenses};
							}
						var totalSubscriptions = [0, 0, 0], totalLicenses = [0, 0, 0];
						var chartData = [ '', [['Lead Source', 'Licenses']], [['Lead Source', 'Licenses']] ], chartColors = [ '', [], [] ];
						var tbody = pNode.appendChild(arcReact({}, totLicenseByLeadSourceTable)).q('tbody')[0];
						for (var id in data){
							//
							var description = (data[id].description == null || data[id].description == 'null' || data[id].description == '') ? 'Not Given' : data[id].description;
							var i = 1, rec = {description: description};
							for (var account in zohoAdmins){
								//rec.color = 'background-color:#'+data[fullname].color+';';
								if (typeof data[id][account] != 'undefined'){
									rec['subscriptions'+i] = numPfx1+data[id][account].subscriptions.toLocaleString();
									rec['licenses'+i] = numPfx2+data[id][account].licenses.toLocaleString();
									//
									//	Count the total number of subscriptions and licenses
									totalSubscriptions[i] += data[id][account].subscriptions;
									totalLicenses[i] += data[id][account].licenses;
									//
									//	Prepare data for charts
									chartData[i].push([description, data[id][account].subscriptions]);
									chartColors[i].push(usernameIcon(description)[1]);
								}
								else{
									chartData[i].push([description, 0]);
									chartColors[i].push(usernameIcon(description)[1]);
								}
								i += 1;
							}
							rec.anchor = '#details/'+slug+'/'+d.getFullYear()+'/'+(d.getMonth()+1)+'/'+id+'/'+description;
							//	Add a row to a table
							tbody.appendChild(arcReact(rec, totLicenseByLeadSourceRow));
						}
						//
						//	Add subtotal row for subscriptions under a fullname
						tbody.parentNode.appendChild(arcReact({totSubs1: numPfx1+totalSubscriptions[1].toLocaleString(), totLicns1: numPfx2+totalLicenses[1].toLocaleString(),
															totSubs2: numPfx1+totalSubscriptions[2].toLocaleString(), totLicns2: numPfx2+totalLicenses[2].toLocaleString()}, tFootByLeadSourceTemplate));
						sorttable.makeSortable(tbody.parentNode);
						//
						//	Draw chart for subscriptions under the fullname
						if (totalLicenses[1] > 0)
							new drawChart(chartData[1], tbody.parentNode.parentNode.q('.chart')[0], 'total-license-products-pie', chartColors[1], tbody);//total-license-by-salesperson
						if (totalLicenses[2] > 0)
							new drawChart(chartData[2], tbody.parentNode.parentNode.q('.chart')[1], 'total-license-products-pie', chartColors[2], tbody);
						//
						//	Display the total number of subscriptions and licenses
						statsCounters[0].innerHTML = numPfx1+totalSubscriptions[1].toLocaleString();
						statsCounters[1].innerHTML = numPfx2+totalLicenses[1].toLocaleString();
						statsCounters[2].innerHTML = numPfx1+totalSubscriptions[2].toLocaleString();
						statsCounters[3].innerHTML = numPfx2+totalLicenses[2].toLocaleString();
					}
				});
		}


		/*/	Prepare template reagents
		var revenueByLeadSourceTable = templates['rev-by-lead-source'].q('table.responsive-table')[0].parentNode;//.innerHTML;
		var revenueByLeadSourceTableParentNode = revenueByLeadSourceTable.parentNode;
		revenueByLeadSourceTable = revenueByLeadSourceTable.parentNode.removeChild(revenueByLeadSourceTable);
		var revenueByLeadSourceRow = revenueByLeadSourceTable.q('tbody tr')[0];
		revenueByLeadSourceRow = arcRead(revenueByLeadSourceRow.parentNode.removeChild(revenueByLeadSourceRow));
		revenueByLeadSourceTable = arcRead(revenueByLeadSourceTable);
		var revenueByLeadSourceParentNodeDefaultHTML = revenueByLeadSourceTableParentNode.innerHTML;
		var tFootRevByLeadSourceTemplate = {tfoot: {content: {tr: {content: [
													{td: {content: 'Total'}},
													{td: {class: 'numeric', content: '0'}}
												]}}}};
		tFootRevByLeadSourceTemplate = [tFootRevByLeadSourceTemplate, {totalRevenue: [tFootRevByLeadSourceTemplate.tfoot.content.tr.content[1].td, 'content']}];
		//	Retrieve stats of a given type for a given month and fill the template
		function fillRevStatsByLeadSource(context, params, pNode, slug, title, numPfx1, numPfx2){
			pNode.innerHTML = loader.innerHTML;//revenueParentNodeDefaultHTML;
			//	If year/month is given use it, or get current year/month
			if (params.length == 2)
				var d = new Date(params[0], params[1]-1);
			else
				var d = new Date();
			//
			//	Fill months list
			var months = context.q('ul.months')[0], month = new Date(), monthStr = '';
			months.innerHTML = '';
			month.setMonth(month.getMonth()-12);
			for (var i = 0; i < 12; i++){
				month.setMonth(month.getMonth()+1);
				monthStr = month.toString().split(' ');
				months.appendChild(elem('li', '<a href="#'+slug+'/'+month.getFullYear()+'/'+(month.getMonth()+1)+'">'+monthStr[1]+' '+monthStr[3]+'</a>'));
			}
			//
			//	Reset / Clean-up the template to fill data
			var statsCounters = context.q('.stats-counter .counter');
			statsCounters[0].innerHTML = '';
			//
			//	Get stats of given type from server
			new ajax('/'+slug+'/'+d.getFullYear()+'/'+(d.getMonth()+1), {
					callback: function(data){
						pNode.innerHTML = revenueByLeadSourceParentNodeDefaultHTML;
						//
						//	Set current year/month to card title
						var cardTitle = context.q('.card-title');
						cardTitle[0].innerHTML = d.toString().split(' ')[1] + ' ' + d.toString().split(' ')[3];
						cardTitle[1].innerHTML = title;
						lastReportTitle = title;
						lastReportNumPfx2 = numPfx2;
						//
						var accounts = eval('('+data.responseText+')');
						//	First let's index data to make a set union between VirusWoman and ViWO Premium
						var data = {};
						for (var account in accounts)
							for (var i = 0; i < accounts[account].length; i++){
								if (typeof data[accounts[account][i].id] == 'undefined')
									data[accounts[account][i].id] = {description: accounts[account][i].description};
								data[accounts[account][i].id][account] = {subscriptions: accounts[account][i].subscriptions, licenses: accounts[account][i].licenses};
							}
						var totalSubscriptions = [0, 0, 0], totalLicenses = [0, 0, 0];
						var chartData = [ '', [['Lead Source', 'Licenses']], [['Lead Source', 'Licenses']] ], chartColors = [ '', [], [] ];
						var tbody = pNode.appendChild(arcReact({}, revenueByLeadSourceTable)).q('tbody')[0];
						for (var id in data){
							//
							var description = (data[id].description == null || data[id].description == 'null' || data[id].description == '') ? 'Not Given' : data[id].description;
							var i = 1, rec = {description: description};
							for (var account in zohoAdmins){
								//rec.color = 'background-color:#'+data[fullname].color+';';
								if (typeof data[id][account] != 'undefined'){
									rec['subscriptions'+i] = numPfx1+data[id][account].subscriptions.toLocaleString();
									rec['licenses'+i] = numPfx2+data[id][account].licenses.toLocaleString();
									//
									//	Count the total number of subscriptions and licenses
									totalSubscriptions[i] += data[id][account].subscriptions;
									totalLicenses[i] += data[id][account].licenses;
									//
									//	Prepare data for charts
									chartData[i].push([description, data[id][account].subscriptions]);
									chartColors[i].push(usernameIcon(description)[1]);
								}
								else{
									chartData[i].push([description, 0]);
									chartColors[i].push(usernameIcon(description)[1]);
								}
								i += 1;
							}
							rec.anchor = '#details/'+slug+'/'+d.getFullYear()+'/'+(d.getMonth()+1)+'/'+id+'/'+description;
							//	Add a row to a table
							tbody.appendChild(arcReact(rec, revenueByLeadSourceRow));
						}
						//
						//	Add subtotal row for subscriptions under a fullname
						tbody.parentNode.appendChild(arcReact({totalRevenue: numPfx1+totalSubscriptions[1].toLocaleString()}, tFootRevByLeadSourceTemplate));
						sorttable.makeSortable(tbody.parentNode);
						//
						//	Draw chart for subscriptions under the fullname
						if (totalLicenses[1] > 0)
							new drawChart(chartData[1], tbody.parentNode.parentNode.q('.chart')[0], 'total-license-products-pie', chartColors[1], tbody);
						//
						//	Display the total number of subscriptions and licenses
						statsCounters[0].innerHTML = numPfx1+totalSubscriptions[1].toLocaleString();
					}
				});
		}//*/

		//	===========================================================================================================
		//	===========================================================================================================
		//	===========================================================================================================

		//	Prepare template reagents
		var totLicenseByUsernameTable = templates['by-salesperson'].q('table.responsive-table')[0].parentNode;//.innerHTML;
		var totLicenseByUsernameParentNode = totLicenseByUsernameTable.parentNode;
		totLicenseByUsernameTable = totLicenseByUsernameTable.parentNode.removeChild(totLicenseByUsernameTable);
		var totLicenseByUsernameRow = totLicenseByUsernameTable.q('tbody tr')[0];
		totLicenseByUsernameRow = arcRead(totLicenseByUsernameRow.parentNode.removeChild(totLicenseByUsernameRow));
		totLicenseByUsernameTable = arcRead(totLicenseByUsernameTable);
		var totLicenseByUsernameParentNodeDefaultHTML = totLicenseByUsernameParentNode.innerHTML;
		var tFootByUsernameTemplate = {tfoot: {content: {tr: {content: [
													{td: {content: 'Total'}},
													{td: {class: 'numeric', content: '0'}},
													{td: {class: 'numeric', content: '0'}},
													{td: {class: 'numeric', content: '0'}},
													{td: {class: 'numeric', content: '0'}}
												]}}}};
		tFootByUsernameTemplate = [tFootByUsernameTemplate, {totSubs1: [tFootByUsernameTemplate.tfoot.content.tr.content[1].td, 'content'], totLicns1: [tFootByUsernameTemplate.tfoot.content.tr.content[2].td, 'content'],
															totSubs2: [tFootByUsernameTemplate.tfoot.content.tr.content[3].td, 'content'], totLicns2: [tFootByUsernameTemplate.tfoot.content.tr.content[4].td, 'content']}];
		//
		//	Retrieve stats of a given type for a given month and fill the template
		function fillMonthStatsByUsername(context, params, pNode, slug, title, numPfx1, numPfx2){
			pNode.innerHTML = loader.innerHTML;//totLicenseParentNodeDefaultHTML;
			//	If year/month is given use it, or get current year/month
			if (params.length == 2)
				var d = new Date(params[0], params[1]-1);
			else
				var d = new Date();
			//
			//	Fill months list
			var months = context.q('ul.months')[0], month = new Date(), monthStr = '';
			months.innerHTML = '';
			month.setMonth(month.getMonth()-12);
			for (var i = 0; i < 12; i++){
				month.setMonth(month.getMonth()+1);
				monthStr = month.toString().split(' ');
				months.appendChild(elem('li', '<a href="#'+slug+'/'+month.getFullYear()+'/'+(month.getMonth()+1)+'">'+monthStr[1]+' '+monthStr[3]+'</a>'));
			}
			//
			//	Reset / Clean-up the template to fill data
			var statsCounters = context.q('.stats-counter .counter');
			statsCounters[0].innerHTML = '';
			statsCounters[1].innerHTML = '';
			statsCounters[2].innerHTML = '';
			statsCounters[3].innerHTML = '';
			//
			//	Get stats of given type from server
			new ajax('/'+slug+'/'+d.getFullYear()+'/'+(d.getMonth()+1), {
					callback: function(data){
						pNode.innerHTML = totLicenseByUsernameParentNodeDefaultHTML;//totLicenseParentNodeDefaultHTML;
						//
						//	Set current year/month to card title
						var cardTitle = context.q('.card-title');
						cardTitle[0].innerHTML = d.toString().split(' ')[1] + ' ' + d.toString().split(' ')[3];
						cardTitle[1].innerHTML = title;
						lastReportTitle = title;
						lastReportNumPfx2 = numPfx2;
						//
						var accounts = eval('('+data.responseText+')');
						//	First let's index data to make a set union between VirusWoman and ViWO Premium
						var data = {};
						for (var account in accounts)
							for (var i = 0; i < accounts[account].length; i++){
								if (typeof data[accounts[account][i].fullname] == 'undefined')
									data[accounts[account][i].fullname] = {};
								data[accounts[account][i].fullname][account] = {subscriptions: accounts[account][i].subscriptions, licenses: accounts[account][i].licenses};
							}
						var totalSubscriptions = [0, 0, 0], totalLicenses = [0, 0, 0];
						var chartData = [ '', [['Salesperson', 'Licenses']], [['Salesperson', 'Licenses']] ], chartColors = [ '', [], [] ];
						var tbody = pNode.appendChild(arcReact({}, totLicenseByUsernameTable)).q('tbody')[0];
						for (var fullname in data){
							//
							var i = 1, rec = {fullname: (fullname == 'null' ? 'Not Given' : fullname)};
							for (var account in zohoAdmins){
								//rec.color = 'background-color:#'+data[fullname].color+';';
								if (typeof data[fullname][account] != 'undefined'){
									rec['subscriptions'+i] = numPfx1+data[fullname][account].subscriptions.toLocaleString();
									rec['licenses'+i] = numPfx2+data[fullname][account].licenses.toLocaleString();
									//
									//	Count the total number of subscriptions and licenses
									totalSubscriptions[i] += data[fullname][account].subscriptions;
									totalLicenses[i] += data[fullname][account].licenses;
									//
									//	Prepare data for charts
									chartData[i].push([(fullname == 'null' ? 'Not Given' : fullname), data[fullname][account].subscriptions]);
									chartColors[i].push(usernameIcon(fullname)[1]);
								}
								else{
									chartData[i].push([(fullname == 'null' ? 'Not Given' : fullname), 0]);
									chartColors[i].push(usernameIcon(fullname)[1]);
								}
								i += 1;
							}
							rec.anchor = '#details/'+slug+'/'+d.getFullYear()+'/'+(d.getMonth()+1)+'/'+fullname.replace(/ /g, '-');
							//	Add a row to a table
							tbody.appendChild(arcReact(rec, totLicenseByUsernameRow));
						}
						//
						//	Add subtotal row for subscriptions under a fullname
						tbody.parentNode.appendChild(arcReact({totSubs1: numPfx1+totalSubscriptions[1].toLocaleString(), totLicns1: numPfx2+totalLicenses[1].toLocaleString(),
															totSubs2: numPfx1+totalSubscriptions[2].toLocaleString(), totLicns2: numPfx2+totalLicenses[2].toLocaleString()}, tFootByUsernameTemplate));
						sorttable.makeSortable(tbody.parentNode);
						//
						//	Draw chart for subscriptions under the fullname
						if (totalLicenses[1] > 0)
							new drawChart(chartData[1], tbody.parentNode.parentNode.q('.chart')[0], 'total-license-products-pie', chartColors[1], tbody);//total-license-by-salesperson
						if (totalLicenses[2] > 0)
							new drawChart(chartData[2], tbody.parentNode.parentNode.q('.chart')[1], 'total-license-products-pie', chartColors[2], tbody);
						//
						//	Display the total number of subscriptions and licenses
						statsCounters[0].innerHTML = numPfx1+totalSubscriptions[1].toLocaleString();
						statsCounters[1].innerHTML = numPfx2+totalLicenses[1].toLocaleString();
						statsCounters[2].innerHTML = numPfx1+totalSubscriptions[2].toLocaleString();
						statsCounters[3].innerHTML = numPfx2+totalLicenses[2].toLocaleString();
					}
				});
		}


		//	Prepare template reagents
		var revenueByUsernameTable = templates['rev-by-salesperson'].q('table.responsive-table')[0].parentNode;//.innerHTML;
		var revenueByUsernameParentNode = revenueByUsernameTable.parentNode;
		revenueByUsernameTable = revenueByUsernameTable.parentNode.removeChild(revenueByUsernameTable);
		var revenueByUsernameRow = revenueByUsernameTable.q('tbody tr')[0];
		revenueByUsernameRow = arcRead(revenueByUsernameRow.parentNode.removeChild(revenueByUsernameRow));
		revenueByUsernameTable = arcRead(revenueByUsernameTable);
		var revenueByUsernameParentNodeDefaultHTML = revenueByUsernameParentNode.innerHTML;
		var tFootRevByUsernameTemplate = {tfoot: {content: {tr: {content: [
													{td: {content: 'Total'}},
													{td: {class: 'numeric', content: '0'}}
												]}}}};
		tFootRevByUsernameTemplate = [tFootRevByUsernameTemplate, {totalRevenue: [tFootRevByUsernameTemplate.tfoot.content.tr.content[1].td, 'content']}];
		//	Retrieve stats of a given type for a given month and fill the template
		function fillRevStatsByUsername(context, params, pNode, slug, title, numPfx1, numPfx2){
			pNode.innerHTML = loader.innerHTML;//revenueParentNodeDefaultHTML;
			//	If year/month is given use it, or get current year/month
			if (params.length == 2)
				var d = new Date(params[0], params[1]-1);
			else
				var d = new Date();
			//
			//	Fill months list
			var months = context.q('ul.months')[0], month = new Date(), monthStr = '';
			months.innerHTML = '';
			month.setMonth(month.getMonth()-12);
			for (var i = 0; i < 12; i++){
				month.setMonth(month.getMonth()+1);
				monthStr = month.toString().split(' ');
				months.appendChild(elem('li', '<a href="#'+slug+'/'+month.getFullYear()+'/'+(month.getMonth()+1)+'">'+monthStr[1]+' '+monthStr[3]+'</a>'));
			}
			//
			//	Reset / Clean-up the template to fill data
			var statsCounters = context.q('.stats-counter .counter');
			//
			//	Get stats of given type from server
			new ajax('/'+slug+'/'+d.getFullYear()+'/'+(d.getMonth()+1), {
					callback: function(data){
						pNode.innerHTML = revenueByUsernameParentNodeDefaultHTML;//revenueParentNodeDefaultHTML;
						//
						//	Set current year/month to card title
						var cardTitle = context.q('.card-title');
						cardTitle[0].innerHTML = d.toString().split(' ')[1] + ' ' + d.toString().split(' ')[3];
						cardTitle[1].innerHTML = title;
						lastReportTitle = title;
						lastReportNumPfx2 = numPfx2;
						//
						var result = eval('('+data.responseText+')')['result'];
						var totalRevenue = 0;
						var chartData = [['Salesperson', 'Revenue']], chartColors = [];
						var tbody = pNode.appendChild(arcReact({}, revenueByUsernameTable)).q('tbody')[0];
						for (var id = 0; id < result.length; id++){
							//
							rec = {fullname: (result[id].fullname == null || result[id].fullname == 'null' || result[id].fullname == '' ? 'Not Given' : result[id].fullname)};
							rec['revenue'] = formatDollarAmount(result[id].revenue);
							//
							//	Count the total
							totalRevenue += result[id].revenue;
							//
							//	Prepare data for charts
							chartData.push([rec.fullname, result[id].revenue]);
							chartColors.push(usernameIcon(rec.fullname)[1]);
							//	Add a row to a table
							tbody.appendChild(arcReact(rec, revenueByUsernameRow));
						}
						//
						//	Add subtotal row for subscriptions under a fullname
						tbody.parentNode.appendChild(arcReact({totalRevenue: formatDollarAmount(totalRevenue)}, tFootRevByUsernameTemplate));
						sorttable.makeSortable(tbody.parentNode);
						//
						//	Draw chart for subscriptions under the fullname
						if (totalRevenue > 0)
							new drawChart(chartData, tbody.parentNode.parentNode.q('.chart')[0], 'total-license-products-pie', chartColors, tbody);
						//
						//	Display the total number of subscriptions and licenses
						statsCounters[0].innerHTML = formatDollarAmount(totalRevenue);
					}
				});
		}


	}

	var templates = {};
	var loadProgress = [0, 0];
	var loadTemplate = function(template, callback){
		loadProgress[0] += 1;
		new ajax('/template/'+template, {callback:
			function(data, callback){
				if (typeof callback != 'undefined')
					callback(data.responseText);
				var templateBody = elem('div', data.responseText, {class: 'middle-content'});
				main.appendChild(templateBody);
				templates[template] = templateBody;
				loadProgress[1] += 1;
				if (loadProgress[0] == loadProgress[1]){
					bindTemplates(templates);
					//sorttable.init();
					//document.body.appendChild(elem('script', null, {src: 'assets/js/sorttable.js'}));
					//
					if (document.location.hash == '')
						document.location.hash = '#dashboard';
					window.onpopstate();
					//
					document.body.addClass('loaded');
					loader.style.display = 'none';
				}
			}}, callback);
	};
	//var loadConverge = ;

	loadTemplate('dashboard');
	loadTemplate('domain');
	loadTemplate('total-revenue');
	loadTemplate('total-licenses',
		function(responseText){
			/*var templateBody = elem('div', responseText, {class: 'middle-content'});
			main.appendChild(templateBody);
			templates['by-salesperson'] = templateBody;*/
			//
			var templateBody = elem('div', responseText, {class: 'middle-content'});
			main.appendChild(templateBody);
			templates['new-subscriptions'] = templateBody;
			//
			templateBody = elem('div', responseText, {class: 'middle-content'});
			main.appendChild(templateBody);
			templates['lost-subscriptions'] = templateBody;
			//
			templateBody = elem('div', responseText, {class: 'middle-content'});
			main.appendChild(templateBody);
			templates['new-aur'] = templateBody;
			//
			templateBody = elem('div', responseText, {class: 'middle-content'});
			main.appendChild(templateBody);
			templates['lost-aur'] = templateBody;
		});
	loadTemplate('by-salesperson');
	loadTemplate('by-lead-source');
	loadTemplate('rev-by-salesperson');
	loadTemplate('rev-by-lead-source');
	loadTemplate('details');
	//loadTemplate('new-subscriptions');

}

localStorage.clear();
for (key in localStorage)
	localStorage.removeItem(key);

initialize();

/*if (typeof sorttable == 'undefined'){
	var sorttable = function(){
		this.makeSortable = function(table){
			setTimeout(
				function(){
					sorttable.makeSortable(table);
				}, 500);
		};//)(table);
		this.isReal = false;
	}
}*/

function formatDollarAmount(money){
	money = (money.toLocaleString()+'.00').split('.');
	return '$ '+money[0]+'.'+(money[1]+'00').substring(0, 2);
}

//	Convert the name to a hex color code based on how it sounds like
//	To get a unique color code per person
function usernameIcon(username){
	var key = 'icon-'+username.toLowerCase().replace(/ /g, '-');
	if (localStorage[key] == undefined){
		username = username.split(' ');
		var un = (username[0][0] + (username.length == 1 ? username[0][1] : username[1][0])).toUpperCase();
		username[0] = soundex(username[0]);
		//console.log(username[0]);
		//username[0] = [(8*parseInt(username[0][0], 32)).toString(16), (3*username[0].substring(1, 3)).toString(16), (32*username[0][3]).toString(16)];
		/*username[0] = [
						parseInt(64 + 0.75*10.25*(username[0].charCodeAt(0)-65)).toString(16),
						parseInt(64 + 0.75*3*username[0].substring(1, 3)).toString(16),
						parseInt(64 + 0.75*32*username[0][3]).toString(16)
					];*/
		username[0] = hslToRgb( ((parseInt(1.44*(username[0].charCodeAt(0)-65)) + username[0].substring(1))%360)/360, 0.6, 0.45 );
		//username[0] = hslToRgb( ( ( parseInt(14.4*(username[0].charCodeAt(0)-65)) + username[0].substring(1) ) % 360) / 360, 0.72, 0.58 );
		//
		username[0] = [username[0][0].toString(16), username[0][1].toString(16), username[0][2].toString(16)];
		username[0] = ('00'+username[0][0]).substring(username[0][0].length) + ('00'+username[0][1]).substring(username[0][1].length) + ('00'+username[0][2]).substring(username[0][2].length);
		localStorage[key] = JSON.stringify([un, username[0]]);
		return [un, username[0]];
	}
	else
		return eval('('+localStorage[key]+')');
}

//	Generates a code based on how a word sounda like.
var soundex = function (s) {
     var a = s.toLowerCase().split(''),
         f = a.shift(),
         r = '',
         codes = {
             a: '', e: '', i: '', o: '', u: '',
             b: 1, f: 1, p: 1, v: 1,
             c: 2, g: 2, j: 2, k: 2, q: 2, s: 2, x: 2, z: 2,
             d: 3, t: 3,
             l: 4,
             m: 5, n: 5,
             r: 6
         };

     r = f +
         a
         .map(function (v, i, a) { return codes[v] })
         .filter(function (v, i, a) {
             return ((i === 0) ? v !== codes[f] : v !== a[i - 1]);
         })
         .join('');

     return (r + '000').slice(0, 4).toUpperCase();
};

function hslToRgb(h, s, l){
    var r, g, b;

    if(s == 0){
        r = g = b = l; // achromatic
    }else{
        function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [parseInt(r * 255), parseInt(g * 255), parseInt(b * 255)];
}




// q('#end_date')[0].onchange(function() {
//     if (this.value != 'undefined') {
//         var a =this.value;
//     }
// })


