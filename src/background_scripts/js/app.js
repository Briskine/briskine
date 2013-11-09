var gqApp = angular.module('gqApp', ['ngRoute', 'angular-md5']);

gqApp.config(function ($routeProvider) {
    $routeProvider
        .when('/options', {
            controller: 'OptionsCtrl',
            templateUrl: 'views/options.html'
        })
        .when('/dialog', {
            controller: 'OptionsCtrl',
            templateUrl: 'views/options.html'
        })
        .when('/popup', {
            controller: 'OptionsCtrl',
            templateUrl: 'views/options.html'
        })
        .otherwise('/options');
});
