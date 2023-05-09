angular
    .module('viwoApp')
    .controller('LicenseChangesCtrl', LicenseChangesCtrl);

function LicenseChangesCtrl($scope, $http, $q, $rootScope, $sce) {
    $rootScope.activeTab = 'license-changes';
    if($rootScope.canceler){
        $rootScope.canceler.resolve("http call aborted");
    }
    $rootScope.canceler = $q.defer();

    var date = new Date();
    $scope.formatedCurrentDate = date.toISOString().substring(0, 10).replace('T', ' ');
    var zohoAdmins = {'reseller.viruswoman.com': 'original', 'reseller.viwopanel.com': 'premium'};
    var licenseChangeTypes = {'new_subscription_license' : new Object(zohoAdmins),
        'active_subscription_license_gain' : new Object(zohoAdmins),
        'active_subscription_license_loss' : new Object(zohoAdmins),
        'active_to_cancel_subscription_license' : new Object(zohoAdmins),
        'cancel_to_active_subscription_license' : new Object(zohoAdmins),
        'upgrade_subscription' : new Object(zohoAdmins),
        'downgrade_subscription' : new Object(zohoAdmins)
    };

    var priorityList = {
        "Google-Apps-For-Business" : 1 ,
        "Google-Apps-Unlimited" : 2 ,
        "1010020020" : 3
    };

    var newSubscription = "new_subscription_license";
    var changeSubscription = "change_subscription_license";
    var activeSubscriptionChange = "active_subscription_license";

    var queryOrder = {
        1 : "active_subscription_license",
        2 : "change_subscription_license",
        3 : "new_subscription_license"
    };

    var annualYearlyPay = 'ANNUAL_YEARLY_PAY';
    var annual = 'ANNUAL';
    var monthlyAnnual = 'MONTHLY_ANNUAL';


    var accountArr = ['orig', 'prem'];
    if(typeof $rootScope.startDate == 'undefined') $rootScope.startDate = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10).replace('T', ' ');
    if(typeof $rootScope.endDate == 'undefined') $rootScope.endDate = date.toISOString().slice(0, 10).replace('T', ' ');
    $scope.date_range = $sce.trustAsHtml(dateToString((new Date($rootScope.startDate)))+' - '+dateToString((new Date($rootScope.endDate))));
    $scope.title = "License Changes";
    $scope.totalData = {};
    $scope.subs = {newOrig: 0, newPrem: 0, lostOrig: 0, lostPrem: 0};
    $scope.errormsg = "";

    $scope.validateDate = function() {
        validateDate($scope, this.startDate, this.endDate);
    };

    $scope.submit = function () {
        $scope.totalData = {};
        $scope.showloadingicon = true;
        $scope.subs = {newOrig: 0, newPrem: 0, lostOrig: 0, lostPrem: 0};
        $rootScope.startDate = this.startDate;
        $rootScope.endDate = this.endDate;
        viewResultNew($scope, $http, $rootScope);
        // viewResultLost($scope, $http);
    };

    var viewResultNew = function($scope, $http, $rootScope) {
        $http.post('/new-license/', {endDate: $rootScope.endDate, startDate: $rootScope.startDate}, {timeout: $rootScope.canceler.promise})
            .success(function(data) {
                $scope.date_range = $sce.trustAsHtml(dateToString((new Date($rootScope.startDate.replace(/-/g, '\/'))))+' - '+dateToString((new Date($rootScope.endDate.replace(/-/g, '\/')))));
                var accounts = data;
                var domainServiceLicenseMap = {};
                var dualSubscriptionMap = {};
                var licenseChangeMap = {};
                var planChangeMap = {};
                //	First let's index data to make a set union between VirusWoman and ViWO Premium
                var data = {};
                var index = 1 ;
                var licenses;
                var accountPlan ;
                $scope.total= {};
                for (var accountIndex in accounts){
                    var account = queryOrder[index];
                    index ++ ;
                    for (var i = 0; i < accounts[account].length; i++){
                        accountPlan = accounts[account][i].plan;
                        if ((accountPlan == annual) && (accounts[account][i].viwo_plan == 'ANNUAL_MONTHLY')){
                            accountPlan = monthlyAnnual;
                        }
                        if (typeof data[accountPlan] == 'undefined'){
                            data[accountPlan] = {};
                        }
                        licenses = accounts[account][i].licenses; // added due to anuual plans shouid get the fixed seats
                        if ((accounts[account][i].plan == annualYearlyPay) || (accounts[account][i].plan == annual)){// keep same for yearly monthly pay also
                            licenses = accounts[account][i].fixedLicenses;
                        }

                        if (licenses != 0){
                            if (typeof data[accountPlan][accounts[account][i].code] == 'undefined'){
                                data[accountPlan][accounts[account][i].code] = {
                                    color: accounts[account][i].color,
                                    skuName : accounts[account][i].skuName,
                                    service_id: accounts[account][i].service_id,
                                    zoho_admin : new Object({
                                        'reseller.viruswoman.com': new Object({'new_subscription_license': 0 ,
                                            'cancel_to_active_subscription_license': 0 ,
                                            'active_to_cancel_subscription_license': 0 ,
                                            'active_subscription_license_gain' : 0,
                                            'active_subscription_license_loss' : 0,
                                            'upgrade_subscription' : 0,
                                            'downgrade_subscription' : 0}),
                                        'reseller.viwopanel.com': new Object({'new_subscription_license': 0 ,
                                            'cancel_to_active_subscription_license': 0 ,
                                            'active_to_cancel_subscription_license': 0 ,
                                            'active_subscription_license_gain' : 0,
                                            'active_subscription_license_loss' : 0,
                                            'upgrade_subscription' : 0,
                                            'downgrade_subscription' : 0})
                                    })
                                };
                            }
                        }

                        if (account == activeSubscriptionChange) {
                            var subscriptionLicenseChangeEntry = new Object({'serviceId' : accounts[account][i].service_id,
                                'code' : accounts[account][i].code,
                                'licenses' : licenses,
                                'zoho_admin' : accounts[account][i].zoho_admin,
                                'order_id' : accounts[account][i].order_id,
                                'cus_id' : accounts[account][i].cus_id,
                                'plan' : accountPlan == annualYearlyPay ? annual : accountPlan,
                                'id' : ""
                            });
                            if (licenses > 0) {
                                data[accountPlan][accounts[account][i].code]['zoho_admin'][accounts[account][i].zoho_admin]['active_subscription_license_gain'] +=
                                    licenses;
                                subscriptionLicenseChangeEntry['status'] =  'active_subscription_license_gain';
                                licenseChangeMap[accounts[account][i].domain] = subscriptionLicenseChangeEntry;

                            } else if (licenses < 0) {
                                data[accountPlan][accounts[account][i].code]['zoho_admin'][accounts[account][i].zoho_admin]['active_subscription_license_loss'] +=
                                    licenses;
                                subscriptionLicenseChangeEntry['status'] =  'active_subscription_license_loss';
                                licenseChangeMap[accounts[account][i].domain] = subscriptionLicenseChangeEntry;

                            }
                        } else if (typeof domainServiceLicenseMap[accounts[account][i].domain] == 'undefined'){
                            var subscriptionLicenseList = [];
                            var subscriptionLicenseEntry = new Object({'serviceId' : accounts[account][i].service_id,
                                'code' : accounts[account][i].code,
                                'licenses' : licenses,
                                'zoho_admin' : accounts[account][i].zoho_admin,
                                'order_id' : accounts[account][i].order_id,
                                'cus_id' : accounts[account][i].cus_id,
                                'plan' :accountPlan == annualYearlyPay ? annual : accountPlan,
                                'id' : ""
                            });

                            if (account == changeSubscription) {
                                if (accounts[account][i].current_status == 'ACTIVE'){
                                    data[accountPlan][accounts[account][i].code]['zoho_admin'][accounts[account][i].zoho_admin]['cancel_to_active_subscription_license'] +=
                                        licenses;
                                    subscriptionLicenseEntry['status'] =  'cancel_to_active_subscription_license';

                                } else {
                                    data[accountPlan][accounts[account][i].code]['zoho_admin'][accounts[account][i].zoho_admin]['active_to_cancel_subscription_license'] +=
                                        -licenses;
                                    subscriptionLicenseEntry['status'] =  'active_to_cancel_subscription_license';
                                }

                            } else if (typeof accounts[account][i].subscription_no != 'undefinded' && accounts[account][i].subscription_no > 1){
                                var previousEntry = new Object({
                                    'status' : 'active_to_cancel_subscription_license',
                                    'plan' : subscriptionLicenseEntry.plan,
                                    'code' : accounts[account][i].previous_plan
                                });
                                currentStatus = getTheAdditionalLiceseStatusestoPut(previousEntry, subscriptionLicenseEntry);
                                if(currentStatus =='upgrade_subscription') {
                                    data[accountPlan][accounts[account][i].code]['zoho_admin'][accounts[account][i].zoho_admin]["upgrade_subscription"] +=
                                        licenses;
                                    subscriptionLicenseEntry['status'] =  'upgrade_subscription';
                                    domainServiceLicenseMap[accounts[account][i].domain] = subscriptionLicenseEntry;
                                } else {
                                    data[accountPlan][accounts[account][i].code]['zoho_admin'][accounts[account][i].zoho_admin]["downgrade_subscription"] +=
                                        licenses;
                                    subscriptionLicenseEntry['status'] =  'downgrade_subscription';
                                    domainServiceLicenseMap[accounts[account][i].domain] = subscriptionLicenseEntry;

                                }
                            } else {
                                data[accountPlan][accounts[account][i].code]['zoho_admin'][accounts[account][i].zoho_admin]['new_subscription_license'] +=
                                    licenses;
                                subscriptionLicenseEntry['status'] = 'new_subscription_license';
                            }
                            domainServiceLicenseMap[accounts[account][i].domain] = subscriptionLicenseEntry ;

                        } else {
                            //assume that the last query coming is the new subscription query and there is no duplicate entries for domain in change_subscription_license
                            //query
                            var licenseDiff;
                            var currentStatus;
                            var tempServiceObject = domainServiceLicenseMap[accounts[account][i].domain];
                            var subscriptionLicenseEntry = new Object({'serviceId' : accounts[account][i].service_id,
                                'code' : accounts[account][i].code,
                                'zoho_admin' : accounts[account][i].zoho_admin,
                                'licenses' : licenses,
                                'order_id' : accounts[account][i].order_id,
                                'cus_id' : accounts[account][i].cus_id,
                                'plan' : accountPlan == annualYearlyPay ? annual : accountPlan,
                                'id' : ""
                            });
                                //assume that only one product is active in a certain time so upgrade or downgrade exist when active_to_cancel_subscription_license is there for an product
                            if (account == newSubscription){
                                // assume that having active status subscriptions are queried first and so no need to remove active to cancel licenses


                                currentStatus = getTheAdditionalLiceseStatusestoPut(tempServiceObject, subscriptionLicenseEntry);
                                if(currentStatus =='upgrade_subscription') {
                                    data[tempServiceObject.plan][tempServiceObject.code]['zoho_admin'][tempServiceObject.zoho_admin]['active_to_cancel_subscription_license'] +=
                                        tempServiceObject.licenses;
                                    data[accountPlan][accounts[account][i].code]['zoho_admin'][accounts[account][i].zoho_admin]["upgrade_subscription"] +=
                                        licenses;
                                    subscriptionLicenseEntry['status'] =  'upgrade_subscription';
                                    domainServiceLicenseMap[accounts[account][i].domain] = subscriptionLicenseEntry;


                                } else if (currentStatus == 'plan_changed'){
                                    //removing the removed licenses when the payent plan is changes
                                    data[tempServiceObject.plan][tempServiceObject.code]['zoho_admin'][tempServiceObject.zoho_admin]["active_to_cancel_subscription_license"] +=
                                        tempServiceObject.licenses;
                                    subscriptionLicenseEntry['status'] =  'plan_changed';
                                    domainServiceLicenseMap[accounts[account][i].domain] = subscriptionLicenseEntry;

                                } else if (currentStatus == 'dual_subscription'){
                                    subscriptionLicenseEntry['status'] =  'new_subscription_license';
                                    dualSubscriptionMap[accounts[account][i].domain] = subscriptionLicenseEntry;
                                    data[accountPlan][accounts[account][i].code]['zoho_admin'][accounts[account][i].zoho_admin]["new_subscription_license"] +=
                                        licenses;
                                } else if (currentStatus == 'downgrade_subscription') {
                                    data[tempServiceObject.plan][tempServiceObject.code]['zoho_admin'][tempServiceObject.zoho_admin]['active_to_cancel_subscription_license'] +=
                                        tempServiceObject.licenses;
                                    data[accountPlan][accounts[account][i].code]['zoho_admin'][accounts[account][i].zoho_admin]["downgrade_subscription"] +=
                                        licenses;
                                    subscriptionLicenseEntry['status'] =  'downgrade_subscription';
                                    domainServiceLicenseMap[accounts[account][i].domain] = subscriptionLicenseEntry;

                                } else {
                                    //removing the removed licenses when the payent plan is changes
                                    data[tempServiceObject.plan][tempServiceObject.code]['zoho_admin'][tempServiceObject.zoho_admin]["active_to_cancel_subscription_license"] +=
                                        tempServiceObject.licenses;
                                    subscriptionLicenseEntry['status'] =  'removed_and_created';
                                    domainServiceLicenseMap[accounts[account][i].domain] = subscriptionLicenseEntry;
                                }
                            }

                            //this different is not added to the inner pages

                            if (currentStatus != "dual_subscription"){ // if it is a dual subscription there is no license difference it is only new addition
                                licenseDiff = licenses - tempServiceObject.licenses;
                                var subscriptionLicenseChangeEntry = new Object({'serviceId' : accounts[account][i].service_id,
                                    'code' : accounts[account][i].code,
                                    'zoho_admin' : accounts[account][i].zoho_admin,
                                    'licenses' : licenseDiff,
                                    'order_id' : accounts[account][i].order_id,
                                    'cus_id' : accounts[account][i].cus_id,
                                    'id' : "",
                                    'plan' :accountPlan == annualYearlyPay ? annual : accountPlan,
                                });

                                if (licenseDiff > 0) {
                                    data[accountPlan][accounts[account][i].code]['zoho_admin'][accounts[account][i].zoho_admin]['active_subscription_license_gain'] +=
                                        licenseDiff;
                                    subscriptionLicenseChangeEntry['status'] =  'active_subscription_license_gain';
                                    licenseChangeMap[accounts[account][i].domain] = subscriptionLicenseChangeEntry;
                                } else if (licenseDiff < 0) {
                                    data[accountPlan][accounts[account][i].code]['zoho_admin'][accounts[account][i].zoho_admin]['active_subscription_license_loss'] +=
                                        licenseDiff;
                                    subscriptionLicenseChangeEntry['status'] =  'active_subscription_license_loss';
                                    licenseChangeMap[accounts[account][i].domain] = subscriptionLicenseChangeEntry;
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
                    var subTotalLicenses = [0, 0];

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
                                anchor: 'details-changes/license-changes/'+$rootScope.startDate+'/'+$rootScope.endDate+'/'+ totalDataPlan +'/'+data[plan][code].service_id +'/'+code + '/' + data[plan][code].skuName
                            };
                        }

                        for (var licenseChange in licenseChangeTypes){
                            for (var zoho_account in licenseChangeTypes[licenseChange]){

                                // for column wise net count for each plan
                                if (typeof $scope.totalData[totalDataPlan][licenseChangeTypes[licenseChange][zoho_account] + "_" + licenseChange] == 'undefined'){
                                    $scope.totalData[totalDataPlan][licenseChangeTypes[licenseChange][zoho_account] + "_" + licenseChange] = 0;
                                }
                                $scope.totalData[totalDataPlan][licenseChangeTypes[licenseChange][zoho_account] + "_" + licenseChange]  += data[plan][code]['zoho_admin'][zoho_account][licenseChange];
                                //

                                // for row wise count for each plan
                                if (typeof $scope.totalData[totalDataPlan]['services']["s"+totalDataServiceId][licenseChangeTypes[licenseChange][zoho_account] + '_net'] == 'undefined'){
                                    $scope.totalData[totalDataPlan]['services']["s"+totalDataServiceId][licenseChangeTypes[licenseChange][zoho_account] + '_net'] = 0;
                                }
                                $scope.totalData[totalDataPlan]['services']["s"+totalDataServiceId][licenseChangeTypes[licenseChange][zoho_account] + '_net'] += data[plan][code]['zoho_admin'][zoho_account][licenseChange];
                                //
                                // total count for each type
                                if (typeof $scope.total[licenseChangeTypes[licenseChange][zoho_account] + "_" +licenseChange] == 'undefined'){
                                    $scope.total[licenseChangeTypes[licenseChange][zoho_account] + "_" +licenseChange] = 0;
                                }
                                $scope.total[licenseChangeTypes[licenseChange][zoho_account] + "_" +licenseChange]   += data[plan][code]['zoho_admin'][zoho_account][licenseChange];

                                if (typeof data[plan][code]['zoho_admin'][zoho_account][licenseChange] != 'undefined'){
                                    $scope.totalData[totalDataPlan]['services']["s"+totalDataServiceId][licenseChangeTypes[licenseChange][zoho_account] + "_" + licenseChange] = data[plan][code]['zoho_admin'][zoho_account][licenseChange];
                                }

                            //   without considering the account

                                //	Count the total number of subscriptions
                                if (typeof $scope.totalData[totalDataPlan]['services']["s" + totalDataServiceId][licenseChange] == 'undefined') {
                                    $scope.totalData[totalDataPlan]['services']["s" + totalDataServiceId][licenseChange] = 0 ;
                                }
                                $scope.totalData[totalDataPlan]['services']["s" + totalDataServiceId][licenseChange] += data[plan][code]['zoho_admin'][zoho_account][licenseChange];

                                // for column wise net count for each plan
                                if (typeof $scope.totalData[totalDataPlan][licenseChange] == 'undefined'){
                                    $scope.totalData[totalDataPlan][licenseChange] = 0;
                                }
                                $scope.totalData[totalDataPlan][licenseChange]  += data[plan][code]['zoho_admin'][zoho_account][licenseChange];
                                //

                            }
                        }
                    }
                }
                $scope.showloadingicon = false;
                $scope.total.original_upgrade = $scope.total.original_cancel_to_active_subscription_license + $scope.total.original_upgrade_subscription;
                $scope.total.premium_upgrade = $scope.total.premium_cancel_to_active_subscription_license + $scope.total.premium_upgrade_subscription;
                $scope.total.original_new = $scope.total.original_new_subscription_license ;
                $scope.total.premium_new = $scope.total.premium_new_subscription_license ;

                $scope.total.new = $scope.total.original_new + $scope.total.premium_new ;
                $scope.total.increment= $scope.total.original_active_subscription_license_gain + $scope.total.premium_active_subscription_license_gain;
                $scope.total.decrement= $scope.total.original_active_subscription_license_loss + $scope.total.premium_active_subscription_license_loss;
                $scope.total.lost= $scope.total.original_active_to_cancel_subscription_license + $scope.total.premium_active_to_cancel_subscription_license;
                $scope.total.upgrades = $scope.total.original_upgrade  + $scope.total.premium_upgrade ;
                $scope.total.downgrades = $scope.total.original_downgrade_subscription + $scope.total.premium_downgrade_subscription;
                $scope.total.net = $scope.total.new + $scope.total.lost + $scope.total.increment + $scope.total.decrement ;
                $rootScope.domainMap = domainServiceLicenseMap;
                $rootScope.licenseChangeMap = licenseChangeMap;
                $rootScope.planChangeMap = planChangeMap;
                $rootScope.dualSubscriptionMap = dualSubscriptionMap;
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    };


    viewResultNew($scope, $http, $rootScope);

    $scope.valueWithPrefix = valueWithPrefix;
    $scope.classByIntValue = classByIntValue;
    $scope.valueWithPrefixForNew = valueWithPrefixForNew;
    $scope.valueWithPrefixForLost = valueWithPrefixForLost;
    $scope.classByIntValueForLost = classByIntValueForLost;
    $scope.classByIntValueForNew = classByIntValueForNew;

    var getTheAdditionalLiceseStatusestoPut = function(previousEntry, currentEntry){
        var currentProductPriority = priorityList[currentEntry.code];
        var previousPorductPriority = priorityList[previousEntry.code];
        var previousPorductStatus = previousEntry.status;
        var previousPlan = previousEntry.plan;
        if (previousPorductStatus == 'new_subscription_license' ){
            return 'dual_subscription'
        } else if (currentProductPriority > previousPorductPriority){
            return 'upgrade_subscription';
        } else if (currentProductPriority < previousPorductPriority){
            return 'downgrade_subscription';

        } else if (previousEntry.plan != currentEntry.plan){
            return 'plan_changed';
        } else {
            return "removed_and_created";
        }
    }


}
