var gqApp = angular.module('gqApp', ['ngRoute']);

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



