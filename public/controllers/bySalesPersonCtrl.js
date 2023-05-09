angular
    .module('viwoApp')
    .controller('BySalesPersonCtrl', BySalesPersonCtrl);

function BySalesPersonCtrl($scope, $http, $q, $rootScope, $sce) {
    $rootScope.activeTab = 'by-salesperson';
    if($rootScope.canceler){
        $rootScope.canceler.resolve("http call aborted");
    }
    $rootScope.canceler = $q.defer();

    var date = new Date();
    // var date=date1.replace(/-/g, '\/');
    //if(typeof $rootScope.startDate == 'undefined') $rootScope.startDate = new Date(date.getFullYear(), date.getMonth(), 2).toISOString().slice(0, 10).replace('T', ' ');
    if(typeof $rootScope.startDate == 'undefined') $rootScope.startDate = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().substring(0, 10);
    if(typeof $rootScope.endDate == 'undefined') $rootScope.endDate = date.toISOString().slice(0, 10).replace('T', ' ');
    // $scope.date_range = $sce.trustAsHtml(dateToString((new Date($rootScope.startDate)))+' - '+dateToString((new Date($rootScope.endDate))));
    $scope.date_range = $sce.trustAsHtml(dateToString(new Date($rootScope.startDate.replace(/-/g, '\/')))+' - '+dateToString((new Date($rootScope.endDate.replace(/-/g, '\/')))));
    $scope.title = 'Licenses by Salesperson';
    $scope.errormsg = '';
    $scope.formatedCurrentDate = date.toISOString().substring(0, 10).replace('T', ' ');
    $scope.showloadingicon = true;

    $scope.validateDate = function() {
        validateDate($scope, this.startDate, this.endDate);
    };

    $scope.submit = function () {
        $rootScope.startDate = this.startDate;
        $rootScope.endDate = this.endDate;
        viewResult($scope, $http);
    };

    var viewResult = function($scope, $http) {
        var zohoAdmins = {'reseller.viruswoman.com': 'ViWO Original', 'reseller.viwopanel.com': 'ViWO Premium'};
        var numPfx1 = "+", numPfx2 = "+" , tot = [];
        var totalSubscriptions = [0, 0, 0], totalLicenses = [0, 0, 0];
        $http.post('/by-salesperson', {endDate: $rootScope.endDate, startDate: $rootScope.startDate}, {timeout: $rootScope.canceler.promise})
            .success(function(data) {
                // $scope.date_range = $sce.trustAsHtml(dateToString((new Date($rootScope.startDate)))+' - '+dateToString((new Date($rootScope.endDate))));
                // $scope.date_range = $sce.trustAsHtm(new Date($rootScope.startDate.replace(/-/g, '\/'))+' - '+(($rootScope.endDate.replace(/-/g, '\/'))));
                $scope.date_range = $sce.trustAsHtml(dateToString(new Date($rootScope.startDate.replace(/-/g, '\/')))+' - '+dateToString((new Date($rootScope.endDate.replace(/-/g, '\/')))));
                // $scope.allLicenceData = data;
                var accounts = formatSqlDataForSalesPerson(data);
                //	First let's index data to make a set union between VirusWoman and ViWO Premium
                var data = {};
                for (var account in accounts)
                    for (var i = 0; i < accounts[account].length; i++){
                        if (typeof data[accounts[account][i].fullname] == 'undefined')
                            data[accounts[account][i].fullname] = {};
                        data[accounts[account][i].fullname][account] = {subscriptions: accounts[account][i].subscriptions, licenses: accounts[account][i].licenses};
                    }
                var totalSubscriptions = [0, 0, 0], totalLicenses = [0, 0, 0];
				var chartData = [ '', [['Salesperson', 'Licenses']], [['Salesperson', 'Licenses']] ], chartColors = [ '', [], [] ];
                var tbody = [];
                for (var fullname in data){
                    var i = 1, rec = {fullname: (fullname == 'null' ? 'Not Given' : fullname)};
                    for (var account in zohoAdmins){
                        //rec.color = 'background-color:#'+data[fullname].color+';';
                        rec.anchor = 'details/by-salesperson/'+$rootScope.startDate+'/'+$rootScope.endDate+'/'+fullname.replace(/\s/g, '-');
                        if (typeof data[fullname][account] != 'undefined'){
                            rec['subscriptions'+i] = data[fullname][account].subscriptions.toLocaleString();
                            rec['licenses'+i] = data[fullname][account].licenses.toLocaleString();
                            //
                            //	Count the total number of subscriptions and licenses
                            totalSubscriptions[i] += data[fullname][account].subscriptions;
                            totalLicenses[i] += data[fullname][account].licenses;
                        }
                        i += 1;
                    }
                    tbody.push(rec);
                }
                tot.push(tbody);
                tot['total'] = {totSubs1: totalSubscriptions[1].toLocaleString(), totLicns1: totalLicenses[1].toLocaleString(),totSubs2: totalSubscriptions[2].toLocaleString(), totLicns2: totalLicenses[2].toLocaleString()};
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
    viewResult($scope, $http);
}

var formatSqlDataForSalesPerson = function (data) {
    var formattedAccount = {"reseller.viwopanel.com" :[], "reseller.viruswoman.com" : []};
    var domainServiceLicenseMap = {};
    var queryOrder = {
        1 : "new_subscriptions",
        2 : "change_subscriptions",
        3 : "active_subscriptions"
    }
    var changeSubscriptionQuery = 'change_subscriptions';
    var activeSubscriptionQuery = 'active_subscriptions';
    var newSubscriptionQuery = 'new_subscriptions';
    var activeState = 'ACTIVE';
    var fullName;
    var noOfLicenses;
    var noOfSubscriptions;
    var fullnameExistInSubscriptionList = false;
    var accName ;
    var existInDomainServiceLicenseMap ;
    var domain ;
    var index = 1 ;
    for (var sqlQueryName in data) {
        sqlQueryName =  queryOrder[index];
        index ++ ;
        for (var i=0; i < data[sqlQueryName].length ; i++){
            var subscriptionLicenseEntry;
            existInDomainServiceLicenseMap = false;
            fullnameExistInSubscriptionList = false;
            fullName = data[sqlQueryName][i]['fullname'];
            noOfLicenses = data[sqlQueryName][i]['licenses'];
            noOfSubscriptions = data[sqlQueryName][i]['subscriptions'];
            id = data[sqlQueryName][i]['id'];
            accName = data[sqlQueryName][i]['zoho_admin'];
            domain = data[sqlQueryName][i]['domain'];

            if (sqlQueryName == changeSubscriptionQuery && data[sqlQueryName][i]['current_status'] != activeState){
                noOfLicenses = -noOfLicenses;
                noOfSubscriptions = -noOfSubscriptions;
                if(typeof domainServiceLicenseMap[domain] != 'undefined'){ //remove the added information as new for subscription upgrades
                    subscriptionLicenseEntry = domainServiceLicenseMap[domain];
                    noOfSubscriptions = -subscriptionLicenseEntry.subscriptions;
                    // noOfLicenses = -subscriptionLicenseEntry.licenses;
                    fullName = subscriptionLicenseEntry.fullname;
                    id = subscriptionLicenseEntry.id;
                }
            }else if (sqlQueryName == newSubscriptionQuery){

                subscriptionLicenseEntry = new Object({
                    'licenses' : noOfLicenses,
                    'zoho_admin' : accName,
                    'subscriptions' : noOfSubscriptions,
                    'fullname' : fullName,
                    'id' : id
                });
                domainServiceLicenseMap[domain] = subscriptionLicenseEntry;
            } else if (sqlQueryName == activeSubscriptionQuery){
                noOfSubscriptions = 0; //no subscription for license change for active subscriptions
            } else {
                noOfSubscriptions = 0; //no new subscriptions for cancel to active subscriptions

            }

            for (var j =0 ; j < formattedAccount[accName].length ; j++){
                if (formattedAccount[accName][j]['fullname'] == fullName) {
                    formattedAccount[accName][j]['licenses'] += noOfLicenses;
                    formattedAccount[accName][j]['subscriptions'] += noOfSubscriptions;
                    fullnameExistInSubscriptionList = true;
                    break;
                }
            }
            if (!fullnameExistInSubscriptionList){
                formattedAccount[accName].push({fullname : fullName, licenses : noOfLicenses, subscriptions:noOfSubscriptions});
            }
        }
    }
    return formattedAccount;
}

