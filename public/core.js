// 'ngRoute' module helps to become a Single Page Application.
// Define the specific templates and controllers for each and every urls.

angular.module('viwoApp', ['ngRoute', 'ngTable', 'ngSanitize', 'ngCsv', 'AngularPrint'])
    .config(['$routeProvider', '$locationProvider', function($routeProvider, $locationProvider) {
        $routeProvider.
          when('/dashboard', {
            templateUrl: 'public/templates/dashboard.html',
            controller: 'DashboardCtrl'
          }).
          when('/viwo-panel', {
              templateUrl: 'public/templates/vivo-panel.html',
              controller: 'VivoPanelCtrl'
          }).
          when('/total-licenses', {
            templateUrl: 'public/templates/total-licenses.html',
            controller: "TotalLicensesCtrl"
          }).
          when('/subscription-changes', {
            templateUrl: 'public/templates/subscription-changes.html',
            controller: "SubscriptionChangesCtrl"
          }).
          when('/by-salesperson', {
            templateUrl: 'public/templates/by-salesperson.html',
            controller: "BySalesPersonCtrl"
          }).
          when('/by-lead-source', {
            templateUrl: 'public/templates/by-lead-source.html',
            controller: "ByLeadSourceCtrl"
          }).
          when('/total-revenue', {
            templateUrl: 'public/templates/total-revenue.html',
            controller: "TotalRevenueCtrl"
          }).
          when('/revenue-by-salesperson', {
            templateUrl: 'public/templates/rev-by-salesperson.html',
            controller: "RevenueBySalesPersonCtrl"
          }).
          when('/revenue-by-lead-source', {
            templateUrl: 'public/templates/rev-by-lead-source.html',
            controller: "RevenueByLeadSourceCtrl"
          }).
          when('/license-changes', {
            templateUrl: 'public/templates/license-changes.html',
            controller: "LicenseChangesCtrl"
          }).
          when('/details/:details*', {
            templateUrl: '/public/templates/details.html', // Starting with forward slash is must If it's a inner page.
            controller: 'DetailsCtrl'
          }).
          when('/details-changes/:details*', {
            templateUrl: '/public/templates/details-changes.html', // Starting with forward slash is must If it's a inner page.
            controller: 'DetailsChangesCtrl'
          }).
          when('/invoices/:invoices*', {
            templateUrl: '/public/templates/invoices.html', // Starting with forward slash is must If it's a inner page.
            controller: 'InvoicesCtrl'
          }).
          when('/domain/:domain*', {
            templateUrl: '/public/templates/domain.html', // Starting with forward slash is must If it's a inner page.
            controller: 'DomainCtrl'
          }).
          otherwise({
            redirectTo: '/dashboard'
          });
        $locationProvider.html5Mode(true);

}]);

