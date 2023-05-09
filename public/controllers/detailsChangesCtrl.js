angular
    .module('viwoApp')
    .controller('DetailsChangesCtrl', DetailsChangesCtrl);

function DetailsChangesCtrl($scope, $routeParams, $http, $q, $rootScope, $sce) {
    if($rootScope.canceler){
        $rootScope.canceler.resolve("http call aborted");
    }
    $rootScope.canceler = $q.defer();

    //getting all the data passing through the URl.
    var details = $routeParams.details;
    params = details.split('/');
    var from_date = new Date(params[1].replace(/-/g, '\/'));
    var to_date = new Date(params[2].replace(/-/g, '\/'));
    var serviceId = params[4];
    var plan = params[3];
    var code = params[5];
    var skuName = params[6];
    $scope.from_date = params[1];
    $scope.to_date = params[2];
    $scope.plan = plan;

    $scope.subtitle = skuName +'-'+params[3];
    var postData = {endDate: params[2], startDate: params[1], params: [params[3],params[5]]};
    $scope.postUrlSfx = '';

    if(params[0] == "subscription-changes"){
        $scope.title = "Subscription Changes";
        $scope.postUrlSfx = "subscriptions";
    } else if(params[0] == "license-changes"){
        $scope.title = "License Changes";
        $scope.postUrlSfx = 'license';
    }

    $scope.totalData = {};
    $scope.totalSum = {};
    $scope.date_range = $sce.trustAsHtml(dateToString(from_date)+' - '+dateToString(to_date));

    var statsNew = function($scope, $http, details) {
                var data ;
                if ($scope.postUrlSfx == 'license'){
                    data = mergeLicenseData(plan, code , $rootScope.domainMap , $rootScope.licenseChangeMap, $rootScope.planChangeMap, $rootScope.dualSubscriptionMap);
                }
                if ($scope.postUrlSfx == 'subscriptions'){
                    data = mergeSubscriptionData(plan, code , $rootScope.domainMap, $rootScope.dualSubMap);
                }
                if (data['new']['reseller.viruswoman.com'].length >0) {
                    $scope.totalData.new = {};
                    $scope.totalData.new['VIWO Original'] = data['new']['reseller.viruswoman.com'];
                }

                if (data['new']['reseller.viwopanel.com'].length > 0) {
                    if (typeof $scope.totalData.new == 'undefined'){
                        $scope.totalData.new = {};
                    }
                    $scope.totalData.new['VIWO Premium'] = data['new']['reseller.viwopanel.com'];
                }

                if (data['increment']['reseller.viruswoman.com'].length >0) {
                    $scope.totalData.increment = {};
                    $scope.totalData.increment['VIWO Original'] = data['increment']['reseller.viruswoman.com'];
                }

                if (data['increment']['reseller.viwopanel.com'].length > 0) {
                    if (typeof $scope.totalData.increment == 'undefined'){
                        $scope.totalData.increment = {};
                    }
                    $scope.totalData.increment['VIWO Premium'] = data['increment']['reseller.viwopanel.com'];
                }

                if (data['lost']['reseller.viruswoman.com'].length > 0) {
                    $scope.totalData.lost = {};
                    $scope.totalData.lost['VIWO Original'] = data['lost']['reseller.viruswoman.com'];
                }
                if (data['lost']['reseller.viwopanel.com'].length > 0) {
                    if (typeof $scope.totalData.lost == 'undefined'){
                        $scope.totalData.lost = {};
                    }
                    $scope.totalData.lost['VIWO Premium'] = data['lost']['reseller.viwopanel.com'];
                }

                if (data['decrement']['reseller.viruswoman.com'].length >0) {
                    $scope.totalData.decrement = {};
                    $scope.totalData.decrement['VIWO Original'] = data['decrement']['reseller.viruswoman.com'];
                }

                if (data['decrement']['reseller.viwopanel.com'].length > 0) {
                    if (typeof $scope.totalData.decrement == 'undefined'){
                        $scope.totalData.decrement = {};
                    }
                    $scope.totalData.decrement['VIWO Premium'] = data['decrement']['reseller.viwopanel.com'];
                }

                if (data['upgrade']['reseller.viruswoman.com'].length >0) {
                    $scope.totalData.upgrade = {};
                    $scope.totalData.upgrade['VIWO Original'] = data['upgrade']['reseller.viruswoman.com'];
                }

                if (data['upgrade']['reseller.viwopanel.com'].length > 0) {
                    if (typeof $scope.totalData.upgrade == 'undefined'){
                        $scope.totalData.upgrade = {};
                    }
                    $scope.totalData.upgrade['VIWO Premium'] = data['upgrade']['reseller.viwopanel.com'];
                }

                if (data['downgrade']['reseller.viruswoman.com'].length >0) {
                    $scope.totalData.downgrade = {};
                    $scope.totalData.downgrade['VIWO Original'] = data['downgrade']['reseller.viruswoman.com'];
                }

                if (data['downgrade']['reseller.viwopanel.com'].length > 0) {
                    if (typeof $scope.totalData.downgrade == 'undefined'){
                        $scope.totalData.downgrade = {};
                    }
                    $scope.totalData.downgrade['VIWO Premium'] = data['downgrade']['reseller.viwopanel.com'];
                }

                if (data['reactivate']['reseller.viruswoman.com'].length >0) {
                    $scope.totalData.reactivate = {};
                    $scope.totalData.reactivate['VIWO Original'] = data['reactivate']['reseller.viruswoman.com'];
                }

                if (data['reactivate']['reseller.viwopanel.com'].length > 0) {
                    if (typeof $scope.totalData.reactivate == 'undefined'){
                        $scope.totalData.reactivate = {};
                    }
                    $scope.totalData.reactivate['VIWO Premium'] = data['reactivate']['reseller.viwopanel.com'];
                }

                for(var key in $scope.totalData.lost){
                    for(var i=0; i<$scope.totalData.lost[key].length; i++){
                        if (typeof $scope.totalSum.lost == 'undefined'){
                            $scope.totalSum.lost = 0;
                        }
                        $scope.totalSum.lost += $scope.totalData.lost[key][i].licenses;
                    }
                }

                for(var key in $scope.totalData.new){
                    for(var i=0; i<$scope.totalData.new[key].length; i++){
                        if (typeof $scope.totalSum.new == 'undefined'){
                            $scope.totalSum.new = 0;
                        }
                        $scope.totalSum.new += $scope.totalData.new[key][i].licenses;
                    }
                }

                for(var key in $scope.totalData.upgrade){
                    for(var i=0; i<$scope.totalData.upgrade[key].length; i++){
                        if (typeof $scope.totalSum.upgrade == 'undefined'){
                            $scope.totalSum.upgrade = 0;
                        }
                        $scope.totalSum.upgrade += $scope.totalData.upgrade[key][i].licenses;
                    }
                }

                for(var key in $scope.totalData.downgrade){
                    for(var i=0; i<$scope.totalData.downgrade[key].length; i++){
                        if (typeof $scope.totalSum.downgrade == 'undefined'){
                            $scope.totalSum.downgrade = 0;
                        }
                        $scope.totalSum.downgrade += $scope.totalData.downgrade[key][i].licenses;
                    }
                }

                for(var key in $scope.totalData.increment){
                    for(var i=0; i<$scope.totalData.increment[key].length; i++){
                        if (typeof $scope.totalSum.increment == 'undefined'){
                            $scope.totalSum.increment = 0;
                        }
                        $scope.totalSum.increment += $scope.totalData.increment[key][i].licenses;
                    }
                }

                for(var key in $scope.totalData.decrement){
                    for(var i=0; i<$scope.totalData.decrement[key].length; i++){
                        if (typeof $scope.totalSum.decrement == 'undefined'){
                            $scope.totalSum.decrement = 0;
                        }
                        $scope.totalSum.decrement += $scope.totalData.decrement[key][i].licenses;
                    }
                }

                for(var key in $scope.totalData.reactivate){
                    for(var i=0; i<$scope.totalData.reactivate[key].length; i++){
                        if (typeof $scope.totalSum.reactivate == 'undefined'){
                            $scope.totalSum.reactivate = 0;
                        }
                        $scope.totalSum.reactivate += $scope.totalData.reactivate[key][i].licenses;
                    }
                }
    };

    statsNew($scope, $http, details);

    $scope.valueWithPrefix = valueWithPrefix;
    $scope.classByIntValue = classByIntValue;
}

var mergeLicenseData = function (plan, code, serviceMap , changeMap, planChangeMap, dualSubscriptionMap) {
    var formattedAccount = {new : {'reseller.viruswoman.com' : [], 'reseller.viwopanel.com':[]}, lost : {'reseller.viruswoman.com' : [], 'reseller.viwopanel.com':[]},
        upgrade : {'reseller.viruswoman.com' : [], 'reseller.viwopanel.com':[]}, downgrade : {'reseller.viruswoman.com' : [], 'reseller.viwopanel.com':[]}, reactivate :  {'reseller.viruswoman.com' : [], 'reseller.viwopanel.com':[]},
        increment : {'reseller.viruswoman.com' : [], 'reseller.viwopanel.com':[]}, decrement : {'reseller.viruswoman.com' : [], 'reseller.viwopanel.com':[]}};
    var cusId;
    // var domain;
    var id;
    var noOfLicenses;
    var accName ;
    var currentStatus ;
    var orderId;
    var entryServiceId;
    var entryPlan;
    var entryCode;
    for (var domain in serviceMap) {
        noOfLicenses = serviceMap[domain].licenses;
        accName = serviceMap[domain].zoho_admin;
        orderId = serviceMap[domain].order_id;
        currentStatus = serviceMap[domain].status;
        cusId = serviceMap[domain].cus_id;
        entryServiceId = serviceMap[domain].serviceId;
        id = serviceMap[domain].id;
        entryPlan = serviceMap[domain].plan;
        entryCode = serviceMap[domain].code;
        console.log(currentStatus);
        if ((currentStatus == "active_to_cancel_subscription_license") && (plan == entryPlan) && (code == entryCode)) {
            formattedAccount['lost'][accName].push({
                domain: domain,
                licenses: noOfLicenses,
                id: id,
                cus_id: cusId,
                product_id: entryServiceId,
                order_id: orderId
            });
        } else if ((currentStatus == "new_subscription_license") && (plan == entryPlan) && (code == entryCode)){
            formattedAccount['new'][accName].push({domain : domain, licenses : noOfLicenses, id:id, cus_id:cusId, product_id: entryServiceId, order_id: orderId});
                    console.log("domain", domain)

        } else if ((currentStatus == "upgrade_subscription") && (plan == entryPlan) && (code == entryCode)){
            formattedAccount['upgrade'][accName].push({domain : domain, licenses : noOfLicenses, id:id, cus_id:cusId, product_id: entryServiceId, order_id: orderId});
        } else if ((currentStatus == "downgrade_subscription") && (plan == entryPlan) && (code == entryCode)) {
            formattedAccount['downgrade'][accName].push({
                domain: domain,
                licenses: noOfLicenses,
                id: id,
                cus_id: cusId,
                product_id: entryServiceId,
                order_id: orderId
            });
        } else if ((currentStatus == "cancel_to_active_subscription_license") && (plan == entryPlan) && (code == entryCode)) {
            formattedAccount['reactivate'][accName].push({
                domain: domain,
                licenses: noOfLicenses,
                id: id,
                cus_id: cusId,
                product_id: entryServiceId,
                order_id: orderId
            });
        }
    }

    for (var domain in changeMap) {
        noOfLicenses = changeMap[domain].licenses;
        accName = changeMap[domain].zoho_admin;
        orderId = changeMap[domain].order_id;
        currentStatus = changeMap[domain].status;
        cusId = changeMap[domain].cus_id;
        entryServiceId = changeMap[domain].serviceId;
        id = changeMap[domain].id;
        entryPlan = changeMap[domain].plan;
        entryCode =changeMap[domain].code;
        if ((currentStatus == "active_subscription_license_gain") && (plan == entryPlan) && (code == entryCode)) {
            formattedAccount['increment'][accName].push({
                domain: domain,
                licenses: noOfLicenses,
                id: id,
                cus_id: cusId,
                product_id: entryServiceId,
                order_id: orderId
            });
        } else if ((currentStatus == "active_subscription_license_loss") && (plan == entryPlan) && (code == entryCode)){
            formattedAccount['decrement'][accName].push({domain : domain, licenses : noOfLicenses, id:id, cus_id:cusId, product_id: entryServiceId, order_id: orderId});
        }
    }

    for (var domain in planChangeMap) {
        noOfLicenses = planChangeMap[domain].licenses;
        accName = planChangeMap[domain].zoho_admin;
        orderId = planChangeMap[domain].order_id;
        currentStatus = planChangeMap[domain].status;
        cusId = planChangeMap[domain].cus_id;
        entryServiceId = planChangeMap[domain].serviceId;
        id = planChangeMap[domain].id;
        entryPlan = planChangeMap[domain].plan;
        entryCode =planChangeMap[domain].code;
        if ((plan == entryPlan) && (code == entryCode)) {
            formattedAccount['new'][accName].push({
                domain: domain,
                licenses: noOfLicenses,
                id: id,
                cus_id: cusId,
                product_id: entryServiceId,
                order_id: orderId
            });
        }

    }

    for (var domain in dualSubscriptionMap) {
        noOfLicenses = dualSubscriptionMap[domain].licenses;
        accName = dualSubscriptionMap[domain].zoho_admin;
        orderId = dualSubscriptionMap[domain].order_id;
        currentStatus = dualSubscriptionMap[domain].status;
        cusId = dualSubscriptionMap[domain].cus_id;
        entryServiceId = dualSubscriptionMap[domain].serviceId;
        id = dualSubscriptionMap[domain].id;
        entryPlan = dualSubscriptionMap[domain].plan;
        entryCode =dualSubscriptionMap[domain].code;
        if ((currentStatus == "new_subscription_license") && (plan == entryPlan) && (code == entryCode)){
                formattedAccount['new'][accName].push({domain : domain, licenses : noOfLicenses, id:id, cus_id:cusId, product_id: entryServiceId, order_id: orderId});
        }
    }
    return formattedAccount;
}

var mergeSubscriptionData = function (plan , code, serviceMap, dualSubscriptionMap) {
    var formattedAccount = {new : {'reseller.viruswoman.com' : [], 'reseller.viwopanel.com':[]}, lost : {'reseller.viruswoman.com' : [], 'reseller.viwopanel.com':[]},
        upgrade : {'reseller.viruswoman.com' : [], 'reseller.viwopanel.com':[]}, downgrade : {'reseller.viruswoman.com' : [], 'reseller.viwopanel.com':[]},  reactivate :  {'reseller.viruswoman.com' : [], 'reseller.viwopanel.com':[]},
        increment : {'reseller.viruswoman.com' : [], 'reseller.viwopanel.com':[]}, decrement : {'reseller.viruswoman.com' : [], 'reseller.viwopanel.com':[]}};
    var cusId;
    // var domain;
    var id;
    var noOfLicenses;
    var accName ;
    var currentStatus ;
    var orderId;
    var entryServiceId;
    var entryPlan;
    var entryCode;
    for (var domain in serviceMap) {
        noOfLicenses = serviceMap[domain].licenses;
        accName = serviceMap[domain].zoho_admin;
        orderId = serviceMap[domain].order_id;
        currentStatus = serviceMap[domain].status;
        cusId = serviceMap[domain].cus_id;
        entryServiceId = serviceMap[domain].serviceId;
        entryPlan = serviceMap[domain].plan;
        entryCode = serviceMap[domain].code;
        id = serviceMap[domain].id;
            if ((currentStatus == "active_to_cancel_subscription") && (plan == entryPlan) && (code == entryCode)) {
                formattedAccount['lost'][accName].push({
                    domain: domain,
                    licenses: noOfLicenses,
                    id: id,
                    cus_id: cusId,
                    product_id: entryServiceId,
                    order_id: orderId
                });
            } else if ((currentStatus == "new_subscription") && (plan == entryPlan) && (code == entryCode)){
                formattedAccount['new'][accName].push({domain : domain, licenses : noOfLicenses, id:id, cus_id:cusId, product_id: entryServiceId, order_id: orderId});
            } else if ((currentStatus == "upgrade_subscription") && (plan == entryPlan) && (code == entryCode)){
                formattedAccount['upgrade'][accName].push({domain : domain, licenses : noOfLicenses, id:id, cus_id:cusId, product_id: entryServiceId, order_id: orderId});
            } else if ((currentStatus == "downgrade_subscription") && (plan == entryPlan) && (code == entryCode)) {
                formattedAccount['downgrade'][accName].push({
                    domain: domain,
                    licenses: noOfLicenses,
                    id: id,
                    cus_id: cusId,
                    product_id: entryServiceId,
                    order_id: orderId
                });
            } else if ((currentStatus == "cancel_to_active_subscription") && (plan == entryPlan) && (code == entryCode)) {
                formattedAccount['reactivate'][accName].push({
                    domain: domain,
                    licenses: noOfLicenses,
                    id: id,
                    cus_id: cusId,
                    product_id: entryServiceId,
                    order_id: orderId
                });
            }
    }

    for (var domain in dualSubscriptionMap) {
        noOfLicenses = dualSubscriptionMap[domain].licenses;
        accName = dualSubscriptionMap[domain].zoho_admin;
        orderId = dualSubscriptionMap[domain].order_id;
        currentStatus = dualSubscriptionMap[domain].status;
        cusId = dualSubscriptionMap[domain].cus_id;
        entryServiceId = dualSubscriptionMap[domain].serviceId;
        entryPlan = dualSubscriptionMap[domain].plan;
        entryCode = dualSubscriptionMap[domain].code;
        id = dualSubscriptionMap[domain].id;
        if ((currentStatus == "new_subscription") && (plan == entryPlan) && (code == entryCode)){
            formattedAccount['new'][accName].push({domain : domain, licenses : noOfLicenses, id:id, cus_id:cusId, product_id: entryServiceId, order_id: orderId});
        }
    }
    return formattedAccount;
}

