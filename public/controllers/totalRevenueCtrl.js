angular
    .module('viwoApp')
    .controller('TotalRevenueCtrl', TotalRevenueCtrl);

function TotalRevenueCtrl($scope, $http, $q, $rootScope, $sce) {
	$rootScope.activeTab = 'total-revenue';
	if($rootScope.canceler){
		$rootScope.canceler.resolve("http call aborted");
	}
	$rootScope.canceler = $q.defer();
    
    var date = new Date();
    $scope.formatedCurrentDate = date.toISOString().substring(0, 10).replace('T', ' ');
    if(typeof $rootScope.startDate == 'undefined') $rootScope.startDate = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10).replace('T', ' ');
    if(typeof $rootScope.endDate == 'undefined') $rootScope.endDate = date.toISOString().slice(0, 10).replace('T', ' ');
    $scope.date_range = $sce.trustAsHtml(dateToString((new Date($rootScope.startDate)))+' - '+dateToString((new Date($rootScope.endDate))));
    $scope.title = 'Total Revenue';
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
        $http.post('/revenue-count-range', {endDate: $rootScope.endDate, startDate: $rootScope.startDate, invoice_list: false}, {timeout: $rootScope.canceler.promise})
            .success(function(data) {
                var result = data.result[0];

                $scope.invoiceCount = (result.sold != null)? result.sold: 0;
                $scope.totalRevenue = ( result.revenue != null)? result.revenue: 0;
                $scope.paid_amount = (result.paid_amount != null)? result.paid_amount: 0;
                $scope.balanceDue = ( result.balance != null)? result.balance: 0;
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });


        $http.post('/revenue-count-range', {endDate: $rootScope.endDate, startDate: $rootScope.startDate, invoice_list: true}, {timeout: $rootScope.canceler.promise})
            .success(function (data) {
                $scope.loading = false;
                $scope.totalData = (data.result.length > 0)? data.result: {};

                $scope.date_range = $sce.trustAsHtml(dateToString((new Date($rootScope.startDate.replace(/-/g, '\/'))))+' - '+dateToString((new Date($rootScope.endDate.replace(/-/g, '\/')))));

                $scope.totalSums = {total: 0, paid: 0, balance: 0};
                for(var key in $scope.totalData){
                    var data = $scope.totalData[key];
                    var temp =  $scope.totalData[key].date.split("T")[0];
                    $scope.totalData[key].date = temp;
                    $scope.totalSums.total += data.total;
                    $scope.totalSums.paid += data.paid;
                    $scope.totalSums.balance += data.balance;

                }

            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    };
    viewResult($scope, $http);
}
