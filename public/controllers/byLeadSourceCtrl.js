angular
    .module('viwoApp')
    .controller('ByLeadSourceCtrl', ByLeadSourceCtrl);

function ByLeadSourceCtrl($scope, $http, $q, $rootScope, $sce) {
    $rootScope.activeTab = 'by-lead-source';
    if($rootScope.canceler){
        $rootScope.canceler.resolve("http call aborted");
    }
    $rootScope.canceler = $q.defer();


    var date = new Date();
    if(typeof $rootScope.startDate == 'undefined') $rootScope.startDate = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10).replace('T', ' ');
    if(typeof $rootScope.endDate == 'undefined') $rootScope.endDate = date.toISOString().slice(0, 10).replace('T', ' ');
    $scope.date_range = $sce.trustAsHtml(dateToString((new Date($rootScope.startDate)))+' - '+dateToString((new Date($rootScope.endDate))));
    $scope.title = 'Licenses by Lead Source';
    $scope.errormsg = '';
    $scope.formatedCurrentDate = date.toISOString().substring(0, 10).replace('T', ' ');

    $scope.validateDate = function() {
        validateDate($scope, this.startDate, this.endDate);
    };

    $scope.submit = function () {
        $scope.showloadingicon = true;
        $rootScope.startDate = this.startDate;
        $rootScope.endDate = this.endDate;
        viewResult($scope, $http, $rootScope);
    };

    var viewResult = function($scope, $http , $rootScope) {
        var zohoAdmins = {'reseller.viruswoman.com': 'ViWO Original', 'reseller.viwopanel.com': 'ViWO Premium'};
        var numPfx1 = "+", numPfx2 = "+" , tot = [];
        var totalSubscriptions = [0, 0, 0], totalLicenses = [0, 0, 0];
        $http.post('/by-lead-source', {endDate: $rootScope.endDate, startDate: $rootScope.startDate}, {timeout: $rootScope.canceler.promise})
            .success(function(data) {
                // $scope.date_range = $sce.trustAsHtml(dateToString((new Date($rootScope.startDate)))+' - '+dateToString((new Date($rootScope.endDate))));
                $scope.date_range = $sce.trustAsHtml(dateToString(new Date($rootScope.startDate.replace(/-/g, '\/')))+' - '+dateToString((new Date($rootScope.endDate.replace(/-/g, '\/')))));
                var accounts = formatSqlData(data, $rootScope);
                var data = {};
                for (var account in accounts)
                    for (var i = 0; i < accounts[account].length; i++){
                        if (typeof data[accounts[account][i].id] == 'undefined')
                            data[accounts[account][i].id] = {description: accounts[account][i].description};
                        data[accounts[account][i].id][account] = {subscriptions: accounts[account][i].subscriptions, licenses: accounts[account][i].licenses};
                    }
                var totalSubscriptions = [0, 0, 0], totalLicenses = [0, 0, 0];
                var chartData = [ '', [['Lead Source', 'Licenses']], [['Lead Source', 'Licenses']] ], chartColors = [ '', [], [] ];
                var tbody = [];
                for (var id in data){
                    //
                    var description = (data[id].description == null || data[id].description == 'null' || data[id].description == '') ? 'Not Given' : data[id].description;
                    var i = 1, rec = {description: description};
                    for (var account in zohoAdmins){
                        rec.anchor = 'details/by-lead-source/'+$rootScope.startDate+'/'+$rootScope.endDate+'/'+id+'/'+description;
                        if (typeof data[id][account] != 'undefined'){
                            rec['subscriptions'+i] = data[id][account].subscriptions;
                            rec['licenses'+i] = data[id][account].licenses;
                            //
                            //	Count the total number of subscriptions and licenses
                            totalSubscriptions[i] += data[id][account].subscriptions;
                            totalLicenses[i] += data[id][account].licenses;
                        }
                        i += 1;
                    }
                    tbody.push(rec);
                }
                tot.push(tbody);
                tot['total'] = {totSubs1: totalSubscriptions[1], totLicns1: totalLicenses[1],totSubs2: totalSubscriptions[2], totLicns2: totalLicenses[2]};
                $scope.showloadingicon = false;
                $scope.totalData = tot;
                $scope.originalLicenses = totalLicenses[1];
                $scope.originalSubs = totalSubscriptions[1];
                $scope.premiumLicenses = totalLicenses[2];
                $scope.premiumSubs = totalSubscriptions[2]
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    };
    viewResult($scope, $http, $rootScope);
}

var formatSqlData = function (data , $rootScope) {
    var annualYearlyPay = 'ANNUAL_YEARLY_PAY';
    var annual = 'ANNUAL';
    var formattedAccount = {"reseller.viwopanel.com" :[], "reseller.viruswoman.com" : []};
    var changeSubscriptionQuery = 'change_subscriptions';
    var activeSubscriptionQuery = 'active_subscriptions';
    var newSubscriptionQuery = 'new_subscriptions';
    var cancelToActive = 'Reactivated SUbscription';
    var activeToCancel = 'Cancel Subscription';
    var changeLicenses = 'Change Licenses';
    var newSubscription = 'New Subscription';
    var changeSubscription = 'Change Subscription';
    var queryOrder = {
        1 : "change_subscriptions",
        2 : "active_subscriptions",
        3 : "new_subscriptions"
    }
    //order matters
    var domainServiceLicenseMap = {};
    var dualSubscriptionMap = {};
    var activeState = 'ACTIVE';
    var cancelState = 'CANCELLED';
    var description;
    var noOfLicenses;
    var noOfSubscriptions;
    var id ;
    var descriptionExistInSubscriptionList = false;
    var accName ;
    var existInDomainServiceLicenseMap ;
    var domain ;
    var index = 1 ;
    var productId;
    var product;
    var cusId ;
    var plan ;
    var skuName;
    for (var sqlQueryName in data) {
        sqlQueryName =  queryOrder[index];
        index ++ ;
            for (var i=0; i < data[sqlQueryName].length ; i++){
               var subscriptionLicenseEntry;
               descriptionExistInSubscriptionList = false;
               existInDomainServiceLicenseMap = false;
               description = data[sqlQueryName][i]['description'];
               plan = data[sqlQueryName][i]['plan'];
               noOfLicenses = data[sqlQueryName][i]['licenses'];
               if ((plan == annualYearlyPay) || (plan == annual)){
                   noOfLicenses = data[sqlQueryName][i]['fixedLicenses'];
               }
               noOfSubscriptions = data[sqlQueryName][i]['subscriptions'];
               id = data[sqlQueryName][i]['id'];
               accName = data[sqlQueryName][i]['zoho_admin'];
               domain = data[sqlQueryName][i]['domain'];
               productId = data[sqlQueryName][i]['product_id'];
               product = data[sqlQueryName][i]['code'];
               cusId = data[sqlQueryName][i]['cus_id'];
               skuName = data[sqlQueryName][i]['skuName'];

                subscriptionLicenseEntry = new Object({
                    'licenses' : noOfLicenses,
                    'zoho_admin' : accName,
                    'subscriptions' : noOfSubscriptions,
                    'description' : description,
                    'id' : id,
                    'cus_id' : cusId,
                    'status' : "",
                    'product_id' : productId,
                    'product' : product,
                    'skuName' : skuName
                });

               if (sqlQueryName == changeSubscriptionQuery && data[sqlQueryName][i]['current_status'] == activeState){// active status entries comes first
                   subscriptionLicenseEntry.status = cancelToActive; //
                   domainServiceLicenseMap[domain] = subscriptionLicenseEntry; // put them in the map
                   noOfLicenses = 0; // don't consider as new
                   noOfSubscriptions = 0;

               } else if (sqlQueryName == changeSubscriptionQuery && typeof domainServiceLicenseMap[domain] == 'undefined' && data[sqlQueryName][i]['current_status'] != activeState){
                   subscriptionLicenseEntry.status = activeToCancel ;
                   domainServiceLicenseMap[domain] = subscriptionLicenseEntry;
                   noOfLicenses = -noOfLicenses; // subscriptions that were lost
                   noOfSubscriptions = -noOfSubscriptions;
               } else if (sqlQueryName == changeSubscriptionQuery){ // subscriptions activated prevois one deactivating current one
                   var previousLicences = domainServiceLicenseMap[domain].licenses;
                   noOfLicenses = noOfLicenses - previousLicences;
                   domainServiceLicenseMap[domain].licenses = -noOfLicenses; // putting license different of active and cancel subscriptions
                   noOfSubscriptions = 0 ;

               }
               else if (sqlQueryName == newSubscriptionQuery && typeof domainServiceLicenseMap[domain] == 'undefined'){ //totally new subscriptions no entries in the map
                   if (typeof data[sqlQueryName][i]['subscription_no'] != 'undefined' && data[sqlQueryName][i]['subscription_no'] > 1){
                       noOfLicenses = 0;
                       noOfSubscriptions = 0;
                       subscriptionLicenseEntry.status = changeSubscription;
                   } else {
                       subscriptionLicenseEntry.status = newSubscription;
                   }
                   domainServiceLicenseMap[domain] = subscriptionLicenseEntry;
               } else if (sqlQueryName == newSubscriptionQuery && domainServiceLicenseMap[domain].status == newSubscription){
                   subscriptionLicenseEntry.status = newSubscription;
                   dualSubscriptionMap[domain] = subscriptionLicenseEntry;
               }
               else if (sqlQueryName == newSubscriptionQuery){ //new subscription but actually a upgrade
                   domainServiceLicenseMap[domain].subscriptions = 0;
                   domainServiceLicenseMap[domain].product = product;
                   domainServiceLicenseMap[domain].skuName = skuName;
                   domainServiceLicenseMap[domain].id = id;
                   domainServiceLicenseMap[domain].product_id = productId;
                   domainServiceLicenseMap[domain].licenses = noOfLicenses - domainServiceLicenseMap[domain].licenses ;
                   domainServiceLicenseMap[domain].status = changeSubscription;
               } else if (sqlQueryName == activeSubscriptionQuery){
                   noOfSubscriptions = 0; //no subscription for license change for active subscriptions
                   subscriptionLicenseEntry.subscriptions = 0;
                   // domainServiceLicenseMap[domain].id = id;
                   subscriptionLicenseEntry.licenses = noOfLicenses;
                   subscriptionLicenseEntry.status = changeLicenses;
                   domainServiceLicenseMap[domain] = subscriptionLicenseEntry;
               }
               for (var j =0 ; j < formattedAccount[accName].length ; j++){
                    if (formattedAccount[accName][j]['description'] == description) {
                        formattedAccount[accName][j]['licenses'] += noOfLicenses;
                        formattedAccount[accName][j]['subscriptions'] += noOfSubscriptions;
                        descriptionExistInSubscriptionList = true;
                        break;
                    }
               }
               if (!descriptionExistInSubscriptionList){
                   formattedAccount[accName].push({description : description, licenses : noOfLicenses, subscriptions:noOfSubscriptions, id : id});
               }
            }
    }
    $rootScope.leadSourceDomainMap = domainServiceLicenseMap;
    $rootScope.leadSourceDualSubsMap = dualSubscriptionMap;
    return formattedAccount;
}


