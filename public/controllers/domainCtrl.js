angular
    .module('viwoApp')
    .controller('DomainCtrl', DomainCtrl);

function DomainCtrl($scope, $routeParams, $http, $q, $rootScope) {
    if($rootScope.canceler){
        $rootScope.canceler.resolve("http call aborted");
    }
    $rootScope.canceler = $q.defer();

    //getting all the data passing through the URl.
    var zoho_admins = {
        "reseller.viruswoman.com": "Zoho Original",
        "reseller.viwopanel.com": "Zoho Premium"
    };
    var salesPersonName;
    var domain = $routeParams.domain;
    var start_date = $routeParams.startDate;
    var end_date = $routeParams.endDate;
    var productId = $routeParams.productId;
    var planPara = $routeParams.plan;
    if ($routeParams.salesPerson != null) {
        salesPersonName = $routeParams.salesPerson.replace(/-/g,' ');
    }
    params = domain.split('/');
    $scope.title = params[1];
    // var from_date = new Date(params[0]);
    // var fdate = from_date.toString().split(' ')[2] + ' ' + from_date.toString().split(' ')[1] + '  \'' + from_date.toString().split(' ')[3].substring(2);
	//
    // var to_date = new Date(params[1]);
    // var tdate = to_date.toString().split(' ')[2] + ' ' + to_date.toString().split(' ')[1] + ' \'' + to_date.toString().split(' ')[3].substring(2);

    // $scope.date_range = fdate+' - '+tdate;
    $http.post('/domain/', {cus_id: params[0], domain: params[1], start_date: start_date, end_date: end_date, salesperson_name:salesPersonName, product_id : productId }, {timeout: $rootScope.canceler.promise})
        .success(function(data) {
            var totData = {};
            if (data.domain.length > 0){
                for(var key in data.domain[0]) {
                    totData[key] = data.domain[0][key];
                }
            } else {
                totData.domain = params[1];
            }

            if (data.invoices.length > 0){
                totData.invoices = data.invoices;
                var date;
                var lastM0difiedDate;
                var due_date;
                for (var i =0 ; i < data.invoices.length ; i++ ){
                    lastM0difiedDate = data.invoices[i].last_modified_time;
                    date = data.invoices[i].date;
                    due_date = data.invoices[i].due_date;
                    due_date = new Date(due_date).toISOString().slice(0, 10).replace('T', ' ');
                    date = new Date(date).toISOString().slice(0, 10).replace('T', ' ');
                    lastM0difiedDate = new Date(lastM0difiedDate).toISOString().slice(0, 10).replace('T', ' ');
                    data.invoices[i].last_modified_time = lastM0difiedDate;
                    data.invoices[i].date = date;
                    data.invoices[i].due_date = due_date;

                }
            }

            if (data.subscriptions.length > 0){
                totData.subscriptions = data.subscriptions;
                for (var i=0; i<totData.subscriptions.length; i++){
                    plan = totData.subscriptions[i].plan;
                    if(totData.subscriptions[i].start_date == "0000-00-00") {
                        totData.subscriptions[i].start_date = "N/A";
                    }
                    if(totData.subscriptions[i].end_date == "0000-00-00") {
                        totData.subscriptions[i].end_date = "N/A";
                    }
                    if (plan != "FLEXIBLE"){
                        totData.subscriptions[i].seats = totData.subscriptions[i].fixed;
                    } else {
                        totData.subscriptions[i].seats = totData.subscriptions[i].flexible;
                    }
                }

                totData.plan = data.subscriptions[0]['skuName'].replace(/-/g, " ")+" - "+
                    data.subscriptions[0]['viwo_plan']+" plan from "+
                    zoho_admins[data.subscriptions[0]['zoho_admin']];
            }

            $scope.totalData = totData;
        })

        .error(function(data) {
            console.log('Error: ' + data);
        });
}