angular
    .module('viwoApp')
    .controller('DetailsCtrl', DetailsCtrl);

function DetailsCtrl($scope, $routeParams, $http, $q, $rootScope, $sce) {
    if($rootScope.canceler){
        $rootScope.canceler.resolve("http call aborted");
    }
    $rootScope.canceler = $q.defer();

    //getting all the data passing through the URl.
    var details = $routeParams.details;
    var annualYearlyPay = 'ANNUAL_YEARLY_PAY';
    var annual = 'ANNUAL';
    params = details.split('/');
    var to_date = new Date(params[2]).toISOString().slice(0, 10).replace('T', ' ');
    $scope.from_date = params[1];
    $scope.to_date = params[2];
    var postData = {};
    if(params[0] == 'by-salesperson'){
        $scope.title = "licenses by salesperson";
        var from_date = new Date(params[1]).toISOString().slice(0, 10).replace('T', ' ');
        $scope.date_range = $sce.trustAsHtml(from_date+' - '+to_date);
        $scope.subtitle = params[4];
        $scope.sales_person = 'salesperson_' + params[3];
        postData = {endDate: params[2], startDate: params[1], params: params[3]};
    } else if(params[0] == 'by-lead-source'){
        $scope.title = "Licenses by Lead Source";
        var from_date = new Date(params[1]).toISOString().slice(0, 10).replace('T', ' ');
        $scope.date_range = $sce.trustAsHtml(from_date+' - '+to_date);
        $scope.subtitle = params[5];

        $scope.totalData = {};
        var data = formatSqlDataForDetailPage($rootScope.leadSourceDomainMap, $rootScope.leadSourceDualSubsMap,  params[3]);
        if (data['reseller.viruswoman.com'].length > 0) {
            $scope.totalData['VIWO Original'] = data['reseller.viruswoman.com'];
        }
        if (data['reseller.viwopanel.com'].length > 0) {
            $scope.totalData['VIWO Premium'] = data['reseller.viwopanel.com'];
        }

        $scope.totalSum = 0;
        for(var key in $scope.totalData){
            for(var i=0; i<$scope.totalData[key].length; i++){
                $scope.totalSum += $scope.totalData[key][i].licenses;
            }
        }
    } else {
        $scope.title = "Total Licenses";
        $scope.subtitle = params[5]+'-'+params[3];
        $scope.date_range = $sce.trustAsHtml("As of "+ to_date);
        postData = {endDate: params[2], startDate: params[1], plans: [params[3]] , code : params[4]};
        if (params[3] == annual){
            postData.plans.push(annualYearlyPay)
        }
        $http.post('/'+params[0]+'/', postData, {timeout: $rootScope.canceler.promise})
            .success(function(data) {
                $scope.totalData = {};
                formatTotalLicenseData(data);
                if (data['reseller.viruswoman.com'].length > 0) {
                    $scope.totalData['VIWO Original'] = data['reseller.viruswoman.com'];
                }
                if (data['reseller.viwopanel.com'].length > 0) {
                    $scope.totalData['VIWO Premium'] = data['reseller.viwopanel.com'];
                }

                $scope.totalSum = 0;
                for(var key in $scope.totalData){
                    for(var i=0; i<$scope.totalData[key].length; i++){
                        $scope.totalSum += $scope.totalData[key][i].licenses;
                    }
                }
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    }
}

var formatTotalLicenseData = function (data) {
    var annualYearlyPay = 'ANNUAL_YEARLY_PAY';
    var annual = 'ANNUAL';

    for (var account in data){
        for (var entry in data[account]){
            if (data[account][entry].plan == annual || data[account][entry].plan == annualYearlyPay){
                data[account][entry].licenses = data[account][entry].fixedLicenses ;
            }
        }
    }
}

var formatSqlDataForDetailPage = function (leadSourceMap, leadSourceDualSubsMap ,zlsId) {
    var formattedAccount = {"reseller.viwopanel.com" :[], "reseller.viruswoman.com" : []};
    var activeToCancel = 'Cancel Subscription';

    var activeState = 'ACTIVE';
    var noOfLicenses;
    var accName;
    var cusId;
    var productId;
    var skuName;
    var code;
    var status;
    var entryZlsId ;
    for (var domain in leadSourceMap) {
        entryZlsId = leadSourceMap[domain].id;
        noOfLicenses = leadSourceMap[domain].licenses;
        cusId = leadSourceMap[domain].cus_id;
        code = leadSourceMap[domain].product;
        productId = leadSourceMap[domain].product_id;
        status = leadSourceMap[domain].status;
        skuName = leadSourceMap[domain].skuName;
        if (status == activeToCancel){
            noOfLicenses = -noOfLicenses;
        }
        accName = leadSourceMap[domain].zoho_admin;
        if (zlsId == entryZlsId){
            formattedAccount[accName].push({domain : domain, licenses : noOfLicenses, cus_id : cusId, product : skuName, product_id : productId, status : status});
        }
    }

    for (var domain in leadSourceDualSubsMap) {
        entryZlsId = leadSourceDualSubsMap[domain].id;
        noOfLicenses = leadSourceDualSubsMap[domain].licenses;
        cusId = leadSourceDualSubsMap[domain].cus_id;
        code = leadSourceDualSubsMap[domain].product;
        productId = leadSourceDualSubsMap[domain].product_id;
        status = leadSourceDualSubsMap[domain].status;
        skuName = leadSourceDualSubsMap[domain].skuName;
        if (status == activeToCancel){
            noOfLicenses = -noOfLicenses;
        }
        accName = leadSourceDualSubsMap[domain].zoho_admin;
        if (zlsId == entryZlsId){
            formattedAccount[accName].push({domain : domain, licenses : noOfLicenses, cus_id : cusId, product : skuName, product_id : productId, status : status});
        }
    }
    return formattedAccount;
}
