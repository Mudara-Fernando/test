angular
    .module('viwoApp')
    .controller('TotalLicensesCtrl', TotalLicensesCtrl);

function TotalLicensesCtrl($scope, $http, $q, $rootScope, $sce) {
    $rootScope.activeTab = 'total-licenses';
    if($rootScope.canceler){
        $rootScope.canceler.resolve("http call aborted");
    }
    $rootScope.canceler = $q.defer();
    var today = new Date().toISOString().substring(0, 10).replace('T', ' ');
    var annualYearlyPay = 'ANNUAL_YEARLY_PAY';
    var annual = 'ANNUAL';
    var annual_monthly = 'ANNUAL_MONTHLY';
    var flexible = 'FLEXIBLE';
    $scope.formatedCurrentDate = today;

    if(typeof $rootScope.asOfDate == 'undefined') $rootScope.asOfDate = new Date().toISOString().slice(0, 10).replace('T', ' ');
    $scope.date_range = $sce.trustAsHtml('As of ' + dateToString((new Date($rootScope.asOfDate))));
    $scope.title = 'Total Licenses';
    $scope.errormsg = "";
    $scope.submit = function () {
        if(this.asOfDate != '' && this.asOfDate <= today) {
            $scope.errormsg = '';
            $rootScope.asOfDate = this.asOfDate;
            $scope.showloadingicon = true;
            viewResult($scope, $http, $rootScope);
        } else if (this.asOfDate > today){
            $scope.errormsg = 'Please enter a date earlier to current date.';
        }
    };

    var viewResult = function($scope, $http, $rootScope) {
        var zohoAdmins = {'reseller.viruswoman.com': 'ViWO Original', 'reseller.viwopanel.com': 'ViWO Premium'};
        var numPfx1 = "", numPfx2 = "" , tot = [];
        var totalSubscriptions = [0, 0, 0], totalLicenses = [0, 0, 0];
        $http.post('/total-licenses', {endDate: $rootScope.asOfDate}, {timeout: $rootScope.canceler.promise})
            .success(function(data) {
                $scope.date_range = $sce.trustAsHtml('As of ' + dateToString((new Date($rootScope.asOfDate.replace(/-/g, '\/')))));
                // $scope.allLicenceData = data;
                var accounts = data;
                //	First let's index data to make a set union between VirusWoman and ViWO Premium
                var data = {};
                var planType;
                for (var account in accounts) {
                    for (var i = 0; i < accounts[account].length; i++){
                        planType = accounts[account][i].viwo_plan;
                        if (typeof planType == 'undefined' || planType == null){
                            planType = accounts[account][i].plan;
                        }
                        if (planType == annualYearlyPay){
                            planType = annual;
                        }
                        if (planType == annual_monthly){
                            planType = annual_monthly;
                        }
                        if (typeof data[planType] == 'undefined')
                            data[planType] = {};
                        if (typeof data[planType][accounts[account][i].code] == 'undefined'){
                            data[planType][accounts[account][i].code] = {color: accounts[account][i].color, skuName : accounts[account][i].skuName};
                        }
                        if (typeof data[planType][accounts[account][i].code][account] == 'undefined'){
                            data[planType][accounts[account][i].code][account] = {subscriptions: accounts[account][i].subscriptions, licenses: planType == flexible ? accounts[account][i].licenses : accounts[account][i].fixedLicenses};
                        } else {
                            data[planType][accounts[account][i].code][account].subscriptions += accounts[account][i].subscriptions;
                            data[planType][accounts[account][i].code][account].licenses += (planType == flexible  ? accounts[account][i].licenses : accounts[account][i].fixedLicenses);
                        }
                    }
                }
                // var totalSubscriptions = [0, 0, 0], totalLicenses = [0, 0, 0];
                //	Now, generate tables and make reports from that
                for (var plan in data){
                    //
                    //	Create seperate tables for subscriptions under different plans
                    // var tbody = pNode.appendChild(arcReact({plan: plan.replace(/_/g, ' ')}, totLicenseTable)).q('tbody')[0];
                    var tbody = [];
                    var subTotalSubscriptions = [0, 0, 0], subTotalLicenses = [0, 0, 0];
                    var chartData = [ '', [['Product', 'Licenses']], [['Product', 'Licenses']] ], chartColors = [ '', [], [] ];
                    //
                    for (var code in data[plan]){
                        var i = 1, rec = {plan: plan.replace(/_/g, ' '), code: code.replace(/-/g, ' ')};
                        for (var account in zohoAdmins){
                            rec.color = 'background-color:#'+data[plan][code].color+';';
                            rec.skuName = data[plan][code].skuName;
                            rec.anchor = 'details/total-licenses/0000-00-00/'+$rootScope.asOfDate+'/'+plan+'/'+code + '/' + data[plan][code].skuName;
                            if (typeof data[plan][code][account] != 'undefined'){
                                rec['subscriptions'+i] = numPfx1+data[plan][code][account].subscriptions.toLocaleString();
                                rec['licenses'+i] = numPfx2+data[plan][code][account].licenses.toLocaleString();
                                //
                                //	Count the total number of subscriptions and licenses
                                subTotalSubscriptions[i] += data[plan][code][account].subscriptions;
                                subTotalLicenses[i] += data[plan][code][account].licenses;
                                //
                                //	Prepare data for charts
                                chartData[i].push([code, data[plan][code][account].licenses]);
                                chartColors[i].push(data[plan][code].color);
                            }
                            else{
                                chartData[i].push([code, 0]);
                                chartColors[i].push(data[plan][code].color);
                            }
                            i += 1;
                        }
                        // rec.anchor = '#details/'+slug+'/'+d.getFullYear()+'/'+(d.getMonth()+1)+'/'+plan+'/'+code;
                        //	Add a row to a table
                        tbody.push(rec);
                    }
                    tbody['plan'] = plan.replace(/_/g, ' ');
                    tbody['total'] = {totSubs1: numPfx1+subTotalSubscriptions[1].toLocaleString(), totLicns1: numPfx2+subTotalLicenses[1].toLocaleString(),
                                                        totSubs2: numPfx1+subTotalSubscriptions[2].toLocaleString(), totLicns2: numPfx2+subTotalLicenses[2].toLocaleString()};

                    //	Add subtotal row for subscriptions under a plan
                    // tbody.push({totSubs1: numPfx1+subTotalSubscriptions[1].toLocaleString(), totLicns1: numPfx2+subTotalLicenses[1].toLocaleString(),
                    //                                     totSubs2: numPfx1+subTotalSubscriptions[2].toLocaleString(), totLicns2: numPfx2+subTotalLicenses[2].toLocaleString()});
                    totalSubscriptions[1] += subTotalSubscriptions[1];
                    totalSubscriptions[2] += subTotalSubscriptions[2];
                    totalLicenses[1] += subTotalLicenses[1];
                    totalLicenses[2] += subTotalLicenses[2];
                    tot.push(tbody);
                    // sorttable.makeSortable(tbody.parentNode);
                }
                $scope.showloadingicon = false;
                $scope.totalData = tot;
                $scope.originalLicenses = totalLicenses[1];
                $scope.originalSubs = totalSubscriptions[1];
                $scope.premiumLicenses = totalLicenses[2];
                $scope.premiumSubs = totalSubscriptions[2];
                $scope.totalSubs = totalSubscriptions[1] + totalSubscriptions[2];
                $scope.totalLic = totalLicenses[1] + totalLicenses[2];
                $rootScope.totalActiveSubscription = data;
                var d = new Date($rootScope.asOfDate);
                $scope.cardTitle = d.toString().split(' ')[2] + ' ' + d.toString().split(' ')[1] + ' ' + d.toString().split(' ')[3];
            })
            .error(function(data) {
                console.log('Error: ' + data);
            });
    };
    viewResult($scope, $http, $rootScope);
}
