var gqApp = angular.module('gqApp', ['ngRoute', 'angular-md5']);

gqApp.config(function ($routeProvider) {
    $routeProvider
        .when('/options', {
            controller: 'OptionsCtrl',
            templateUrl: 'views/quicktexts.html'
        })
        .when('/dialog', {
            controller: 'DialogCtrl',
            templateUrl: 'views/dialog.html'
        })
        .when('/popup', {
            controller: 'PopupCtrl',
            templateUrl: 'views/popup.html'
        })
        .otherwise('/options');
});
