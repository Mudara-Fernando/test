angular
    .module('viwoApp', ['chart.js'])
    .controller('DashboardCtrl', DashboardCtrl);

function DashboardCtrl($scope, $http, $q, $rootScope, $sce) {
	$rootScope.activeTab = 'dashboard';
	if($rootScope.canceler){
		$rootScope.canceler.resolve("http call aborted");
	}
	$rootScope.canceler = $q.defer();

//	-----------------------------------------------------------------------------
//	Fetch total licence details and bind with the frontend
//	-----------------------------------------------------------------------------
    var today = new Date().toISOString().slice(0, 10).replace('T', ' ');
	var monthStart = new Date();
    var flexible = 'FLEXIBLE';
	monthStart.setDate(1);
    $scope.originalLicenses = 0;
    $scope.originalSubs = 0;
    $scope.premiumLicenses = 0;
    $scope.premiumSubs = 0;
	$scope.monthTitle = $sce.trustAsHtml("Total Licenses per month as of 1<sup>st</sup> "+monthStart.toLocaleString('en-us', { month: "long" })+" "+monthStart.getFullYear());

    $http.post('/license-count', {endDate: today}, {timeout: $rootScope.canceler.promise})
        .success(function(data) {
			
			angular.forEach(data, function(row, key){
				if(row['zoho_admin'] === 'reseller.viruswoman.com') {
					$scope.originalLicenses = row['licenses'];
					$scope.originalSubs = row['subscriptions'];
				} else {
					$scope.premiumLicenses = row['licenses'];
					$scope.premiumSubs = row['subscriptions'];
				}
			});

	
            // $scope.licenceCount = data;
            // var zohoAdmin;
            // var plan;
            // for (var entry in data['license_count']){
            //     zohoAdmin = data['license_count'][entry].zoho_admin;
            //     plan = data['license_count'][entry].plan;
            //     if (plan ==flexible){
            //     	if (zohoAdmin == 'reseller.viruswoman.com'){
            //             $scope.originalLicenses += data['license_count'][entry].licenses;
            //             $scope.originalSubs += data['license_count'][entry].subscriptions;
			// 		} else {
            //             $scope.premiumLicenses += data['license_count'][entry].licenses;
            //             $scope.premiumSubs += data['license_count'][entry].subscriptions;
			// 		}
			// 	} else {//fixedLicenses
            //         if (zohoAdmin == 'reseller.viruswoman.com'){
            //             $scope.originalLicenses += data['license_count'][entry].fixedLicenses;
            //             $scope.originalSubs += data['license_count'][entry].subscriptions;
            //         } else {
            //             $scope.premiumLicenses += data['license_count'][entry].fixedLicenses;
            //             $scope.premiumSubs += data['license_count'][entry].subscriptions;
            //         }
			// 	}
			// }
        })
        .error(function(data) {
            console.log('Error: ' + data);
        });
//	-----------------------------------------------------------------------------
//	Display chart of total licence count for all previous months
//	-----------------------------------------------------------------------------
    $http.post('/license-count-all', {endDate: today}, {timeout: $rootScope.canceler.promise})
        .success(function(data) {
            $scope.licenceCountAllMonths = data;
            $scope.labels = [];
            $scope.original = [];
            $scope.premium = [];
            $scope.series = ["viwo original","viwo premium"];

            ($scope.licenceCountAllMonths['reseller.viruswoman.com']).forEach(function(entry){
                $scope.labels.push(entry.d1);
                $scope.original.push(entry.licenses);
            });
            ($scope.licenceCountAllMonths['reseller.viwopanel.com']).forEach(function(entry){
                $scope.premium.push(entry.licenses);
            });
            var total = $scope.original.map(function (entryVale, idx) {
                return entryVale + $scope.premium[idx];
            })
			console.log($scope.labels);
            var data = {
				labels: $scope.labels,
				datasets: [
					{
						label: "Viwo Original",
						fillColor: "rgba(88,80,246,0.5)",
						strokeColor: "rgba(88,80,246,0.8)",
						pointColor: "rgba(88,80,246,2)",
						pointStrokeColor: "#fff",
						pointHighlightFill: "rgba(88,80,246,0.75)",
						pointHighlightStroke: "rgba(88,80,246,1)",
						data: $scope.original
					},
					{
						label: "Viwo Premium",
						fillColor: "rgba(40,250,0,0.5)",
						strokeColor: "rgba(40,250,0,0.8)",
						pointColor: "rgba(40,250,0,2)",
						pointStrokeColor: "#fff",
						pointHighlightFill: "rgba(40,250,0,0.75)",
						pointHighlightStroke: "rgba(40,250,0,1)",
						data: $scope.premium
					},
                    {
                        label: "Total",
                        fillColor: "rgba(0, 0, 0, 0.5)",
                        strokeColor: "rgba(179, 223, 232, 0.8)",
                        pointColor: "rgba(179, 223, 232, 2)",
                        pointStrokeColor: "#fff",
                        pointHighlightFill: "rgba(179, 223, 232, 0.75)",
                        pointHighlightStroke: "rgba(179, 223, 232, 0.1)",
                        data: total
                    }

				]
			};
			var cv = $("#canvas").get(0).getContext("2d");
			var mychart = new Chart(cv).Line(data, {
				scaleOverride : true,
				scaleSteps : 4,
				scaleStepWidth : 25000,
				scaleStartValue : 0,
				tooltipFillColor: "rgba(0,0,0,0.8)",
				multiTooltipTemplate: "<%= datasetLabel %> - <%= value %>"
			});
        })
        .error(function(data) {
            console.log('Error: ' + data);
        });
//	-----------------------------------------------------------------------------
//	Display chart of total revenue for all previous months
//	-----------------------------------------------------------------------------
	var d = new Date();
	var start = new Date(d.getFullYear(), d.getMonth()-11, 0);
	var end = new Date(d.getFullYear(), d.getMonth()+1, 0);
	// var end = new Date(d.getFullYear(), d.getMonth(), 0);
	$scope.revenueDetails = [];
	$scope.months = [];
	$scope.revenue = [];
	$scope.paid_amount = [];
	$scope.totalRevenue = 0.0;
	var limit, monthRevenue;
	limit = end.getMonth() - start.getMonth() + (12 * (end.getFullYear() - start.getFullYear()));

	var get_revenue_details = function(sdate, offset, limit) {
		if (offset == limit){
			drawRevenueChart();
			return $scope.revenueDetails;
		}
		var month_start = new Date(sdate.getFullYear(), sdate.getMonth(), 1);
		var mstart = month_start.getFullYear()+'-'+(month_start.getMonth()+1)+'-'+month_start.getDate();

		var month_end = new Date(sdate.getFullYear(), sdate.getMonth()+1, 0);
		var mend = month_end.getFullYear()+'-'+(month_end.getMonth()+1)+'-'+month_end.getDate();

		$http.post('/revenue-count-range', {startDate: mstart, endDate: mend}, {timeout: $rootScope.canceler.promise})
			.then(function(response) {
				monthRevenue = response.data;
				var date = sdate.toString().split(' ')[1] + ' ' + sdate.toString().split(' ')[3];
				$scope.revenueDetails.unshift({
					month: date,
					revenue: monthRevenue['result'][0].revenue,
					paid_amount: monthRevenue['result'][0].paid_amount,
					balance: monthRevenue['result'][0].balance,
					anchor: 'invoices/revenue-count-range/'+mstart+'/'+mend
				});
				$scope.totalRevenue += monthRevenue['result'][0].revenue;
				sdate.setMonth(sdate.getMonth()+1);
				get_revenue_details(sdate, offset+1, limit);
			});
	};

	var drawRevenueChart = function(){
		// Make a copy of array and reverse it, so that original array remains unchanged
		var revenueDetails = Array.prototype.slice.call($scope.revenueDetails);
		revenueDetails.reverse();

		(revenueDetails).forEach(function(entry){
			$scope.months.push(entry.month);
			var x = (entry.revenue != null) ? entry.revenue.toFixed(2) : entry.revenue;
			$scope.revenue.push(x);

			var y = (entry.paid_amount != null) ? entry.paid_amount.toFixed(2) : entry.paid_amount;
			$scope.paid_amount.push(y);
		});
		var data = {
			labels: $scope.months,
			datasets: [
				{
					label: "Revenue",
					fillColor: "rgba(88,80,246,0.5)",
					strokeColor: "rgba(88,80,246,0.8)",
					pointColor: "rgba(88,80,246,2)",
					pointStrokeColor: "#fff",
					pointHighlightFill: "rgba(88,80,246,0.75)",
					pointHighlightStroke: "rgba(88,80,246,1)",
					data: $scope.revenue
				},
				{
					label: "Paid",
					fillColor: "rgba(88,80,246,0.5)",
					strokeColor: "rgba(88,80,246,0.8)",
					pointColor: "rgba(88,80,246,2)",
					pointStrokeColor: "#fff",
					pointHighlightFill: "rgba(88,80,246,0.75)",
					pointHighlightStroke: "rgba(88,80,246,1)",
					data: $scope.paid_amount
				}
			]
		};

		var cv = $("#canvasRev").get(0).getContext("2d");
		if (window.mychart != undefined)
			window.mychart.destroy();
		window.mychart = new Chart(cv).Line(data, {
            // scaleOverride: true,
            // scaleSteps: 8,
            // scaleStepWidth: 100000,
            //scaleStepWidth: Math.pow(10, 5),
           // scaleLabel: "<%= Number(value / 1000) + ' MB'%>",
           //  yLabelWidth: 20,
           //  scaleStartValue: 0,
			tooltipFillColor: "rgba(0,0,0,0.8)",
			multiTooltipTemplate: "<%= datasetLabel %> - <%= value %>"
		});
	};
	get_revenue_details(start, 0, limit);
}


/***********************************************************************
* Custom functions to be used in all controllers across the application
************************************************************************/

// Returns date as html in the format:- 01<sup>st</sup> Dec 2016
function dateToString(date) {
	var monthName = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
	var monthNameShort = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
	var thisDate = date.getDate();

	// date suffix
	var suffix = '';
	if(thisDate == 1 || thisDate == 21 || thisDate == 31){
		suffix = '<sup>st</sup>';
	} else if(thisDate == 2 || thisDate == 22){
		suffix = '<sup>nd</sup>';
	} else if(thisDate == 3 || thisDate == 23){
		suffix = '<sup>rd</sup>';
	} else {
		suffix = '<sup>th</sup>';
	}

	return ("0" + thisDate).slice(-2) + suffix + ' ' + monthNameShort[date.getMonth()] + ' ' + date.getFullYear();
}

// Prepend plus sign (+) if value is above zero
function valueWithPrefix(value) {
	if(typeof value == "undefined") {
		return 0;
	}
	return (value > 0)? "+"+value: value;
}

function valueWithPrefixForNew(value) {
    if(typeof value == "undefined") {
        return 0;
    }
    return (value > 0)? "+"+value: 0;
}

function valueWithPrefixForLost(value) {
    if(typeof value == "undefined") {
        return 0;
    }
    return (value < 0)? value: 0;
}
// Return class string based on value (plus or minus)
function classByIntValue(value) {
	if(typeof value == "undefined") {
		return "";
	}

	if(value > 0){
		return "counter-plus";
	} else if(value < 0){
		return "counter-minus";
	} else {
		return "";
	}
}

function classByIntValueForNew(value) {
    if(typeof value == "undefined") {
        return "";
    }

    if(value > 0){
        return "counter-plus";
    } else if(value < 0){
        return "";
    }
}

function classByIntValueForLost(value) {
    if(typeof value == "undefined") {
        return "";
    }

    if(value < 0){
        return "counter-minus";
    } else {
        return "";
    }
}

// Return value with leading zero if less that 10
function withLeadingZero(value) {
	return (value < 10 && value >= 0)? '0'+value: value;
}

// Validate the date fields in date selector
function validateDate(scope, startDate, endDate) {
	if(startDate == '' || endDate == ''){
		scope.errormsg = 'Please enter a valid start and end date.';
	} else {
		var startD = new Date(startDate);
		var endD = new Date(endDate);
        var today = new Date().toISOString().substring(0, 10).replace('T', ' ');
		if(startD > endD){
			scope.errormsg = 'Start date has to be earlier than end date.';
		} else if(today < endDate){
            scope.errormsg = 'Please enter a date earlier to current date.';
		} else {
			scope.errormsg = '';
		}
	}
}

// Format value as dollar amount with two decimal points
function formatDollarAmount(money){
	money = (money.toLocaleString()+'.00').split('.');
	return '$ '+money[0]+'.'+(money[1]+'00').substring(0, 2);
}
