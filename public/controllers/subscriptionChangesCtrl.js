angular
    .module('viwoApp')
    .controller('SubscriptionChangesCtrl', SubscriptionChangesCtrl);

function SubscriptionChangesCtrl($scope, $http, $q, $rootScope, $sce) {
    $rootScope.activeTab = 'subscription-changes';
    if($rootScope.canceler){
        $rootScope.canceler.resolve("http call aborted");
    }
    $rootScope.canceler = $q.defer();

    var date = new Date();
    $scope.formatedCurrentDate = date.toISOString().substring(0, 10).replace('T', ' ');
    var zohoAdmins = {'reseller.viruswoman.com': 'original', 'reseller.viwopanel.com': 'premium'};
    var subscriptionChangeTypes = {'new_subscription' : new Object(zohoAdmins),
        'active_to_cancel_subscription' : new Object(zohoAdmins),
        'cancel_to_active_subscription' : new Object(zohoAdmins),
        'upgrade_subscription': new Object(zohoAdmins),
        'downgrade_subscription': new Object(zohoAdmins)
    };

    var priorityList = {
                        "Google-Apps-For-Business" : 1 ,
                        "Google-Apps-Unlimited" : 2 ,
                        "1010020020" : 3
    };

    var queryOrder = {
        1 : "change_subscription",
        2 : "new_subscription"
    };

    var annualYearlyPay = 'ANNUAL_YEARLY_PAY';
    var annual = 'ANNUAL';
    var flexible = 'FLEXIBLE';
    var monthlyAnnual = 'MONTHLY_ANNUAL';

    if(typeof $rootScope.startDate == 'undefined') $rootScope.startDate = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10).replace('T', ' ');
    if(typeof $rootScope.endDate == 'undefined') $rootScope.endDate = date.toISOString().slice(0, 10).replace('T', ' ');
    $scope.date_range = $sce.trustAsHtml(dateToString((new Date($rootScope.startDate)))+' - '+dateToString((new Date($rootScope.endDate))));
    $scope.title = "Subscription Changes";
    $scope.totalData = {};
    $scope.subs = {newOrig: 0, newPrem: 0, lostOrig: 0, lostPrem: 0};
    $scope.errormsg = "";
    $scope.total = {};

    $scope.validateDate = function() {
        validateDate($scope, this.startDate, this.endDate);
    };

    $scope.submit = function () {
        $scope.showloadingicon = true;
        $scope.totalData = {};
        $scope.subs = {newOrig: 0, newPrem: 0, lostOrig: 0, lostPrem: 0};
        $rootScope.startDate = this.startDate;
        $rootScope.endDate = this.endDate;
        $scope.total.original_new_subscription=0 ;
        $scope.total.original_cancel_to_active_subscription = 0;
        $scope.total.original_active_to_cancel_subscription = 0;
        $scope.total.premium_new_subscription = 0 ;
        $scope.total.premium_cancel_to_active_subscription = 0;
        $scope.total.premium_active_to_cancel_subscription = 0;

        $scope.total.original_upgrade_subscription = 0;
        $scope.total.original_downgrade_subscription = 0;
        $scope.total.premium_upgrade_subscription = 0 ;
        $scope.total.premium_downgrade_subscription = 0;

        viewResultNew($scope, $http , $rootScope);
    };

    var viewResultNew = function($scope, $http, $rootScope) {
        $http.post('/new-subscriptions', {endDate: $rootScope.endDate, startDate: $rootScope.startDate}, {timeout: $rootScope.canceler.promise})
            .success(function(data) {
                $scope.date_range = $sce.trustAsHtml(dateToString(new Date($rootScope.startDate.replace(/-/g, '\/')))+' - '+dateToString((new Date($rootScope.endDate.replace(/-/g, '\/')))));
                var accounts = data;
                var domainServiceMap = {};
                var dualSubscriptionMap = {};
                //	First let's index data to make a set union between VirusWoman and ViWO Premium
                var data = {};
                var accountPlan ;
                var licenses;
                var index = 1 ;
                for (var account in accounts){
                    var account = queryOrder[index];
                    index ++ ;
                    for (var i = 0; i < accounts[account].length; i++){
                        accountPlan = accounts[account][i].plan;
                        licenses = accounts[account][i].fixedLicenses;
                        if ((accountPlan == annual) && (accounts[account][i].viwo_plan == 'ANNUAL_MONTHLY')){
                            accountPlan = monthlyAnnual;
                        } else if (accountPlan== flexible){
                            licenses = accounts[account][i].licenses;
                        }
                        if (typeof data[accountPlan] == 'undefined'){
                            data[accountPlan] = {};
                        }
                        if (typeof data[accountPlan][accounts[account][i].code] == 'undefined'){
                            data[accountPlan][accounts[account][i].code] = {
                                color: accounts[account][i].color,
                                skuName : accounts[account][i].skuName,
                                service_id: accounts[account][i].service_id,
                                zoho_admin : new Object({
                                    'reseller.viruswoman.com': new Object({'new_subscription': 0 ,
                                        'cancel_to_active_subscription': 0 ,
                                        'active_to_cancel_subscription': 0 ,
                                        'upgrade_subscription' : 0,
                                        'downgrade_subscription' : 0
                                    }),
                                    'reseller.viwopanel.com': new Object({'new_subscription': 0 ,
                                        'cancel_to_active_subscription': 0 ,
                                        'active_to_cancel_subscription': 0,
                                        'upgrade_subscription' : 0,
                                        'downgrade_subscription' : 0
                                    })
                                })
                            };
                        }

                            if (typeof domainServiceMap[accounts[account][i].domain] == 'undefined'){
                                var subscriptionEntry = new Object({'serviceId' : accounts[account][i].service_id,
                                    'code' : accounts[account][i].code,
                                    'plan' :accountPlan == annualYearlyPay ? annual : accountPlan,
                                    'zoho_admin' : accounts[account][i].zoho_admin,
                                    'licenses' : licenses,
                                    'order_id' : accounts[account][i].order_id,
                                    'cus_id' : accounts[account][i].cus_id,
                                    'id' : ""
                                });


                                if (account == 'change_subscription') {
                                    if (accounts[account][i].current_status == 'ACTIVE'){
                                        data[accountPlan][accounts[account][i].code]['zoho_admin'][accounts[account][i].zoho_admin]['cancel_to_active_subscription'] +=
                                            accounts[account][i].subscriptions;
                                        subscriptionEntry['status'] =  'cancel_to_active_subscription';

                                    } else {
                                        data[accountPlan][accounts[account][i].code]['zoho_admin'][accounts[account][i].zoho_admin]['active_to_cancel_subscription'] +=
                                            accounts[account][i].subscriptions;
                                        subscriptionEntry['status'] =  'active_to_cancel_subscription';
                                    }
                                } else if (typeof accounts[account][i].subscription_no != 'undefinded' && accounts[account][i].subscription_no > 1){
                                    var previousEntry = new Object({
                                        'status' : 'active_to_cancel_subscription',
                                        'plan' : subscriptionEntry.plan,
                                        'code' : accounts[account][i].previous_plan
                                    });
                                    currentStatus = getTheAdditionalStatusestoPut(previousEntry, subscriptionEntry);
                                    if (currentStatus =='upgrade_subscription') {
                                        data[accountPlan][accounts[account][i].code]['zoho_admin'][accounts[account][i].zoho_admin]["upgrade_subscription"] +=
                                            accounts[account][i].subscriptions;
                                        subscriptionEntry['status'] =  'upgrade_subscription';
                                        domainServiceMap[accounts[account][i].domain] = subscriptionEntry;
                                    } else {
                                        data[accountPlan][accounts[account][i].code]['zoho_admin'][accounts[account][i].zoho_admin]["downgrade_subscription"] +=
                                            accounts[account][i].subscriptions;
                                        subscriptionEntry['status'] =  'downgrade_subscription';
                                        domainServiceMap[accounts[account][i].domain] = subscriptionEntry;
                                    }
                                } else {
                                    data[accountPlan][accounts[account][i].code]['zoho_admin'][accounts[account][i].zoho_admin]["new_subscription"] +=
                                        accounts[account][i].subscriptions;
                                    subscriptionEntry['status'] =  'new_subscription';

                                }

                                domainServiceMap[accounts[account][i].domain] = subscriptionEntry;
                            } else {
                                var tempServiceObject = domainServiceMap[accounts[account][i].domain];
                                var productName = accounts[account][i].code;
                                var currentStatus;

                                var subscriptionEntry = new Object({'serviceId' : accounts[account][i].service_id,
                                    'code' : productName,
                                    'plan' :accountPlan == annualYearlyPay ? annual : accountPlan,
                                    'zoho_admin' : accounts[account][i].zoho_admin,
                                    'licenses' : licenses,
                                    'order_id' : accounts[account][i].order_id,
                                    'cus_id' : accounts[account][i].cus_id,
                                    'id' : ""
                                });

                                if (account == 'change_subscription' && accounts[account][i].current_status == 'ACTIVE') {
                                    if (accounts[account][i].current_status == 'ACTIVE'){
                                        // data[accounts[account][i].plan][accounts[account][i].code]['zoho_admin'][accounts[account][i].zoho_admin]['cancel_to_active_subscription'] +=
                                        //     accounts[account][i].subscriptions;
                                        // subscriptionEntry['status'] =  ['cancel_to_active_subscription'];
                                        // currentStatusses = getTheAdditionalStatusestoPut(tempServiceObjects, subscriptionEntry, 'cancel_to_active_subscription');
                                        // subscriptionEntry['status'] = currentStatusses;
                                        // data[accounts[account][i].plan][accounts[account][i].code]['zoho_admin'][accounts[account][i].zoho_admin]["new_subscription"] +=
                                        //     accounts[account][i].subscriptions;
                                        // // consider create a low priority subscription
                                        // if(currentStatusses.indexOf('upgrade_subscription') > -1) {
                                        //     data[accounts[account][i].plan][accounts[account][i].code]['zoho_admin'][accounts[account][i].zoho_admin]["upgrade_subscription"] +=
                                        //         accounts[account][i].subscriptions;
                                        // }
                                    } else if (account == 'change_subscription' && accounts[account][i].current_status != 'ACTIVE'){
                                        // data[accounts[account][i].plan][accounts[account][i].code]['zoho_admin'][accounts[account][i].zoho_admin]['active_to_cancel_subscription'] +=
                                        //     accounts[account][i].subscriptions;
                                        // subscriptionEntry['status'] =  ['active_to_cancel_subscription'];
                                        // currentStatusses = getTheAdditionalStatusestoPut(tempServiceObjects, subscriptionEntry, 'active_to_cancel_subscription');
                                        // subscriptionEntry['status'] = currentStatusses;
                                        // if(currentStatusses.indexOf('downgrade_subscription') > -1) {
                                        //     data[accounts[account][i].plan][accounts[account][i].code]['zoho_admin'][accounts[account][i].zoho_admin]["upgrade_subscription"] +=
                                        //         accounts[account][i].subscriptions;
                                        // }  else if (currentStatusses.indexOf('active_to_cancel_subscription') > -1){
                                        //
                                        // }
                                    }
                                    domainServiceMap[accounts[account][i].domain] = subscriptionEntry;
                                }
                                else {

                                    if (tempServiceObject.status != 'new_subscription'){ // having two entries in new subscription for the same domain
                                        data[tempServiceObject.plan][tempServiceObject.code]['zoho_admin'][tempServiceObject.zoho_admin]["active_to_cancel_subscription"] -= 1;
                                    }
                                    currentStatus = getTheAdditionalStatusestoPut(tempServiceObject, subscriptionEntry);
                                    if(currentStatus =='upgrade_subscription') {
                                        data[accountPlan][accounts[account][i].code]['zoho_admin'][accounts[account][i].zoho_admin]["upgrade_subscription"] +=
                                            accounts[account][i].subscriptions;
                                        subscriptionEntry['status'] =  'upgrade_subscription';
                                        domainServiceMap[accounts[account][i].domain] = subscriptionEntry;
                                    } else if (currentStatus == 'plan_changed'){
                                            delete domainServiceMap[accounts[account][i].domain];
                                    } else if (currentStatus == 'dual_subscription'){
                                        subscriptionEntry['status'] =  'new_subscription';
                                        dualSubscriptionMap[accounts[account][i].domain] = subscriptionEntry;
                                        data[accountPlan][accounts[account][i].code]['zoho_admin'][accounts[account][i].zoho_admin]["new_subscription"] += 1;
                                    } else {
                                        data[accountPlan][accounts[account][i].code]['zoho_admin'][accounts[account][i].zoho_admin]["downgrade_subscription"] +=
                                            accounts[account][i].subscriptions;
                                        subscriptionEntry['status'] =  'downgrade_subscription';
                                        domainServiceMap[accounts[account][i].domain] = subscriptionEntry;
                                    }

                                }

                            }
                    }
                }
                //	Now, generate tables and make reports from that
                var totalDataPlan ; //plan name of the total data (merge annual yearly pay and annual)
                var annualyearlyToAnuualserviceIdMapping = {21 : 4, 22 : 5};
                var totalDataServiceId ;
                for (var plan in data){
                    //	Create seperate tables for subscriptions under different plans
                    totalDataPlan = plan;
                    if (plan == annualYearlyPay){
                        totalDataPlan = annual;
                    }

                    if(typeof $scope.totalData[totalDataPlan] == 'undefined') {
                        $scope.totalData[totalDataPlan] = {};
                    }
                    if(typeof $scope.totalData[totalDataPlan]['services'] == 'undefined') {
                        $scope.totalData[totalDataPlan]['services'] = {};
                    }
                    var subTotalSubscriptions = [0, 0];

                    for (var code in data[plan]){

                        totalDataServiceId = data[plan][code].service_id;
                        if (plan == annualYearlyPay){
                            totalDataPlan = annual;
                            totalDataServiceId = annualyearlyToAnuualserviceIdMapping[data[plan][code].service_id]; // get the relavant annual service id for the annual yearly pay
                        }
                        //	Add a row to a table
                        if(typeof $scope.totalData[totalDataPlan]['services']["s" + totalDataServiceId] == 'undefined') {
                            $scope.totalData[totalDataPlan]['services']["s" + totalDataServiceId] = {
                                plan: plan.replace(/_/g, ' '),
                                code: code.replace(/-/g, ' '),
                                skuName : data[plan][code].skuName,
                                service_id: data[plan][code].service_id,
                                anchor: 'details-changes/subscription-changes/'+$rootScope.startDate+'/'+$rootScope.endDate+'/'+plan+'/'+ data[plan][code].service_id +'/'+code + '/' + data[plan][code].skuName
                            };
                        }

                        for (var subscriptionChange in subscriptionChangeTypes){
                            for (var zoho_account in subscriptionChangeTypes[subscriptionChange]) {
                                if (typeof data[plan][code]['zoho_admin'][zoho_account][subscriptionChange] != 'undefined') {

                                    //	Count the total number of subscriptions
                                    $scope.totalData[totalDataPlan]['services']["s" + totalDataServiceId][subscriptionChangeTypes[subscriptionChange][zoho_account] + "_" + subscriptionChange] = data[plan][code]['zoho_admin'][zoho_account][subscriptionChange];

                                    //for row wise net count for each plan
                                    if (typeof $scope.totalData[totalDataPlan]['services']["s" + totalDataServiceId][subscriptionChangeTypes[subscriptionChange][zoho_account] + "_net"] == 'undefined'){
                                        $scope.totalData[totalDataPlan]['services']["s" + totalDataServiceId][subscriptionChangeTypes[subscriptionChange][zoho_account] + "_net"] = 0;
                                    }
                                    $scope.totalData[totalDataPlan]['services']["s" + totalDataServiceId][subscriptionChangeTypes[subscriptionChange][zoho_account] + "_net"] += data[plan][code]['zoho_admin'][zoho_account][subscriptionChange];
                                    //

                                    // for column wise net count for each plan
                                    if (typeof $scope.totalData[totalDataPlan][subscriptionChangeTypes[subscriptionChange][zoho_account] + "_" + subscriptionChange] == 'undefined'){
                                        $scope.totalData[totalDataPlan][subscriptionChangeTypes[subscriptionChange][zoho_account] + "_" + subscriptionChange] = 0;
                                    }
                                    $scope.totalData[totalDataPlan][subscriptionChangeTypes[subscriptionChange][zoho_account] + "_" + subscriptionChange]  += data[plan][code]['zoho_admin'][zoho_account][subscriptionChange];
                                    //

                                    //    total count
                                    if (typeof $scope.total[subscriptionChangeTypes[subscriptionChange][zoho_account] + "_" + subscriptionChange] == 'undefined'){
                                        $scope.total[subscriptionChangeTypes[subscriptionChange][zoho_account] + "_" + subscriptionChange] = 0 ;
                                    }
                                    $scope.total[subscriptionChangeTypes[subscriptionChange][zoho_account] + "_" + subscriptionChange] += data[plan][code]['zoho_admin'][zoho_account][subscriptionChange];
                                    //

                                //    without considering the account

                                    //	Count the total number of subscriptions
                                    if (typeof $scope.totalData[totalDataPlan]['services']["s" + totalDataServiceId][subscriptionChange] == 'undefined') {
                                        $scope.totalData[totalDataPlan]['services']["s" + totalDataServiceId][subscriptionChange] = 0 ;
                                    }
                                    $scope.totalData[totalDataPlan]['services']["s" + totalDataServiceId][subscriptionChange] += data[plan][code]['zoho_admin'][zoho_account][subscriptionChange];

                                    //for row wise net count for each plan
                                    if (typeof $scope.totalData[totalDataPlan]['services']["s" + totalDataServiceId]["net"] == 'undefined'){
                                        $scope.totalData[totalDataPlan]['services']["s" + totalDataServiceId]["net"] = 0;
                                    }
                                    $scope.totalData[totalDataPlan]['services']["s" + totalDataServiceId]["net"] += data[plan][code]['zoho_admin'][zoho_account][subscriptionChange];
                                    //

                                    // for column wise net count for each plan
                                    if (typeof $scope.totalData[totalDataPlan][subscriptionChange] == 'undefined'){
                                        $scope.totalData[totalDataPlan][subscriptionChange] = 0;
                                    }
                                    $scope.totalData[totalDataPlan][subscriptionChange]  += data[plan][code]['zoho_admin'][zoho_account][subscriptionChange];
                                    //

                                }
                            }
                        }
                    }

                }
                $scope.showloadingicon = false;
                $scope.total.original_new = $scope.total.original_new_subscription ;
                $scope.total.original_lost = $scope.total.original_active_to_cancel_subscription;
                $scope.total.premium_new = $scope.total.premium_new_subscription;
                $scope.total.premium_lost = $scope.total.premium_active_to_cancel_subscription;
                $scope.total.original_net = $scope.total.original_new - $scope.total.original_lost;
                $scope.total.premium_net = $scope.total.premium_new - $scope.total.premium_lost;

                $scope.total.new = $scope.total.original_new + $scope.total.premium_new;
                $scope.total.lost = $scope.total.original_lost + $scope.total.premium_lost;
                $scope.total.upgrades = $scope.total.original_upgrade_subscription + $scope.total.premium_upgrade_subscription;
                $scope.total.downgrades = $scope.total.original_downgrade_subscription + $scope.total.premium_downgrade_subscription;
                $scope.total.net = $scope.total.new - $scope.total.lost;
                $rootScope.domainMap = domainServiceMap;
                $rootScope.dualSubMap = dualSubscriptionMap;
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    };

    viewResultNew($scope, $http, $rootScope);

    $scope.valueWithPrefix = valueWithPrefix;
    $scope.classByIntValue = classByIntValue;

    var getTheAdditionalStatusestoPut = function(previousEntry, currentEntry){

        var currentProductPriority = priorityList[currentEntry.code];
        var previousProductPriority = priorityList[previousEntry.code];
        var previousProductStatus = previousEntry.status;

        if (previousProductStatus == 'new_subscription'){
            return 'dual_subscription';
        }
        else if (currentProductPriority > previousProductPriority){
            return 'upgrade_subscription';
        } else if (previousProductPriority > currentProductPriority){
            return 'downgrade_subscription';
        } else if (previousEntry.plan != currentEntry.plan){
            return 'plan_changed';
        }
    }

}
