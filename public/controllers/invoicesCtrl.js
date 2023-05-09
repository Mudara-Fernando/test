angular
    .module('viwoApp')
    .controller('InvoicesCtrl', InvoicesCtrl);

function InvoicesCtrl($scope, $routeParams, $http, $q, $rootScope, $sce) {
    if($rootScope.canceler){
        $rootScope.canceler.resolve("http call aborted");
    }
    $rootScope.canceler = $q.defer();

    //getting all the data passing through the URl.
    var invoices = $routeParams.invoices;
    params = invoices.split('/');
    var from_date = new Date(params[1]);
    var to_date = new Date(params[2]);

    var postData = {};
    if(params[0] == 'revenue-by-salesperson'){
        $scope.title = "revenue by salesperson";
        $scope.subtitle = params[4].replace(/-/g, " ");
        postData = {endDate: params[2], startDate: params[1], params: params[3]};
    } else if(params[0] == 'revenue-by-lead-source'){
        $scope.title = "Revenue by Lead Source";
        $scope.subtitle = params[4];
        postData = {endDate: params[2], startDate: params[1], params: [params[3],params[4]]};
    } else {
        $scope.title = "Total Revenue";
        $scope.subtitle = "";
        postData = {endDate: params[2], startDate: params[1], invoice_list: true};
    }

    $scope.date_range = $sce.trustAsHtml(params[1]+' - '+params[2]);
    $scope.loading = true;
    $http.post('/'+params[0]+'/', postData, {timeout: $rootScope.canceler.promise})
        .success(function(data) {
            $scope.loading = false;
            $scope.totalData = (data.result.length > 0)? data.result: {};

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
            $scope.loading = false;
            console.log('Error: ' + data);
        });
}
