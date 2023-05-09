angular
    .module('viwoApp')
    .controller('RevenueBySalesPersonCtrl', RevenueBySalesPersonCtrl);

function RevenueBySalesPersonCtrl($scope, $http, $q, $rootScope, $sce) {
	$rootScope.activeTab = 'revenue-by-salesperson';
	if($rootScope.canceler){
		$rootScope.canceler.resolve("http call aborted");
	}
	$rootScope.canceler = $q.defer();

    var date = new Date();
    $scope.formatedCurrentDate = date.toISOString().substring(0, 10).replace('T', ' ');
    if(typeof $rootScope.startDate == 'undefined') $rootScope.startDate = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10).replace('T', ' ');
    if(typeof $rootScope.endDate == 'undefined') $rootScope.endDate = date.toISOString().slice(0, 10).replace('T', ' ');
    $scope.date_range = $sce.trustAsHtml(dateToString((new Date($rootScope.startDate)))+' - '+dateToString((new Date($rootScope.endDate))));
    $scope.title = 'Revenue by Sales Person';
    $scope.errormsg = '';

    $scope.validateDate = function() {
        validateDate($scope, this.startDate, this.endDate);
    };

    $scope.submit = function () {
        $rootScope.startDate = this.startDate;
        $rootScope.endDate = this.endDate;
        viewResult($scope, $http);
    };

    var viewResult = function($scope, $http) {
		$scope.loading = true;
		$http.post('/revenue-by-salesperson', {endDate: $rootScope.endDate, startDate: $rootScope.startDate}, {timeout: $rootScope.canceler.promise})
            .success(function(data) {
                $scope.date_range = $sce.trustAsHtml(dateToString((new Date($rootScope.startDate.replace(/-/g, '\/'))))+' - '+dateToString((new Date($rootScope.endDate.replace(/-/g, '\/')))));
            	$scope.loading = false;
                // $scope.allLicenceData = data;
                var result = data['result'];
                //	First let's index data to make a set union between VirusWoman and ViWO Premium
                var totalRevenue = 0;
                var totalBalance = 0;
                var totalPaid = 0;
                var totalInvoices = 0;
                $scope.xAxis=[];
                $scope.yAxis=[];
				var chartData = [['Salesperson', 'Revenue']], chartColors = [];
                var tbody = [];
                for (var id = 0; id < result.length; id++){
							//
                    rec = {fullname: (result[id].fullname == null || result[id].fullname == 'null' || result[id].fullname == '' ? 'Not Given' : result[id].fullname)};
					rec.anchor = 'invoices/revenue-by-salesperson/'+$rootScope.startDate+'/'+$rootScope.endDate+'/'+result[id].id+'/'+rec.fullname;
                    rec['invoices'] = result[id].invoices;
                    rec['revenue'] = formatDollarAmount(result[id].revenue);
                    rec['paid_amount'] = formatDollarAmount(result[id].paid_amount);
                    rec['balance'] = formatDollarAmount(result[id].balance);
                    //
                    //	Count the total
                    totalInvoices += result[id].invoices;
                    totalRevenue += result[id].revenue;
                    totalPaid += result[id].paid_amount;
                    totalBalance += result[id].balance;
                    tbody.push(rec);
                    $scope.xAxis[id]=(result[id].fullname == null || result[id].fullname == 'null' || result[id].fullname == '' ? 'Not Given' : result[id].fullname);
                    $scope.yAxis[id]= (result[id].revenue).toFixed(2);
                }
                tbody['total'] = {
                    totInv:totalInvoices,
					totRev:formatDollarAmount(totalRevenue),
					totPaid:formatDollarAmount(totalPaid),
					totBal:formatDollarAmount(totalBalance)
                };
                $scope.totalData = tbody;
                $scope.totInvoices = totalInvoices;
                $scope.totRevenue = totalRevenue;
                $scope.totPaidAmount = totalPaid;
                $scope.totBalance = totalBalance;
                // $scope.xAxis1=tbody.fullname;
                // $scope.yAxis1=tbody;

                console.log($scope.xAxis);
                console.log($scope.yAxis);
                var data1 = {
                    labels: $scope.xAxis,
                    datasets: [
                        {
                            label: "Revenue",
                            fillColor: "rgba(88,80,246,0.5)",
                            strokeColor: "rgba(88,80,246,0.8)",
                            pointColor: "rgba(88,80,246,2)",
                            pointStrokeColor: "#fff",
                            pointHighlightFill: "rgba(88,80,246,0.75)",
                            pointHighlightStroke: "rgba(88,80,246,1)",
                            data: $scope.yAxis
                        }
                    ]
                };
                var cv = $("#canvasRev").get(0).getContext("2d");
                if (window.mychart != undefined)
                    window.mychart.destroy();
                window.mychart = new Chart(cv).Bar(data1, {
                    tooltipFillColor: "rgba(0,0,0,0.8)",
                    multiTooltipTemplate: "<%= datasetLabel %> - <%= value %>"
                });
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    };
    viewResult($scope, $http);
}
