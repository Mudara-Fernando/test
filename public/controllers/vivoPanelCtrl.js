angular
    .module('viwoApp')
    .controller('VivoPanelCtrl', VivoPanelCtrl);



// VivoPanelCtrl.$inject = ['$scope', '$interval', 'NgTableParams', '$http', '$q', '$rootScope', '$sce'];

function VivoPanelCtrl($scope, $interval, NgTableParams, $http, $q, $rootScope, $sce) {
    $rootScope.activeTab = 'viwo-panel';
    if ($rootScope.canceler) {
        $rootScope.canceler.resolve("http call aborted");
    }
    $rootScope.canceler = $q.defer();
    $scope.self = this;
    $scope.loading = true;
    $scope.panelEntriesCount = 1000; // this should not hard coded , total viwo panel entries
    $scope.loadedPanelEntriesCount = 0;
    var viewResult;
    viewResult = function ($scope, $http, NgTableParams) {
        $http.post('/viwo-panel')
            .success(function (data1) {
                console.log('data1: ' ,data1); 
                $scope.filename = "Panel-ViWo";
                $scope.getArray = function () {
                    return $scope.self.tableParams.orderedData();
                };
                $scope.getHeader = function () {
                    return ["Subscription ID", "Customer Name", "Product Description",
                        "Creation Date", "Plan Type", "Expires", "Purchased licenses", "Max No. Seats", "In Trial?", "Trial Expires", "Renewal Type","zoho_admin", "status"]
                };
                var countRows = Object.keys(data1.panels).length;
                $scope.loadedPanelEntriesCount = countRows;
                $scope.countRows = countRows;
                $scope.lastCronDate = data1['lastcrondate'][0]['max_date'];
                $scope.panelStatus1 = data1['panelStatus'][0]['manual_update'];
                $scope.panelStatus2 = data1['panelStatus'][1]['manual_update'];


                $scope.self.expireDateFilterDef = {

                    end: {
                        id: 'date',
                        placeholder: 'End'
                    },
                    start: {
                        id: 'date',
                            placeholder: 'Start'
                }

                };

                $scope.self.tableParams = new NgTableParams({
                    sorting: { subsid: "desc" }
                }, {
                    filterOptions: { filterFn: ageRangeFilter },
                    counts: [10, 25, 50, 100, 200, 500],
                    dataset: data1.panels,
                    filterLayout: "horizontal"
                });

                $scope.self.applyGlobalSearch = applyGlobalSearch;
                function applyGlobalSearch() {
                    var term = $scope.self.globalSearchTerm;
                    if ($scope.self.isInvertedSearch) {
                        term = "!" + term;
                    }
                    $scope.self.tableParams.filter({$: term});
                }

                $scope.self.changePage = changePage;
                $scope.self.changePageSize = changePageSize;
                $scope.self.ageRangeFilter = ageRangeFilter;

                function changePage(nextPage) {
                    $scope.self.tableParams.page(nextPage);
                }

                function changePageSize(newSize) {
                    $scope.self.tableParams.count(newSize);
                }

                function ageRangeFilter(data, filterValues/*, comparator*/){
                    return data.filter(function(item){
                        var twoYearsAfterDate = new Date();
                        var oldDate = new Date("2015-09-05");
                        twoYearsAfterDate.setYear(twoYearsAfterDate.getFullYear() + 2);
                        var end = filterValues.start == null ?  twoYearsAfterDate : new Date(filterValues.start);
                        var start = filterValues.end == null ? oldDate : new Date(filterValues.end);
                        return  ((start <= new Date(item.end_date)) && (end >= new Date(item.end_date))) ;
                    });
                }

                if ($scope.panelStatus1 == 'No' && $scope.panelStatus2 == 'No'){
                    $scope.loading = false;
                }
            })
            .error(function (data) {
                console.log('Error: ' + data);
            });
    };
    viewResult($scope, $http, NgTableParams);
    $interval(function () {
        if ($scope.panelStatus1 == 'Yes' || $scope.panelStatus2 == 'Yes'){
            console.log("refreshing");
            viewResult($scope, $http, NgTableParams);
        }
    }, 5000);
}
