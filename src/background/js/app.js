/* Quicktext chrome extension
 */

var gqApp = angular.module('gqApp', [
        'ngRoute',
        'ngResource',
        'ngAnimate',
        'angular-md5'
    ]).config(function($routeProvider, $compileProvider) {

        $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension):/);

        $routeProvider
            .when('/list', {
                controller: 'ListCtrl',
                templateUrl: 'views/list.html',
                reloadOnSearch: false
            })
            .when('/settings', {
                controller: 'SettingsCtrl',
                templateUrl: 'views/settings.html'
            })
            .when('/popup', {
                controller: 'ListCtrl',
                templateUrl: 'views/list.html'
            })
            .otherwise({
                redirectTo: '/list'
            });
    });

/* Global run
 */
gqApp.run(function($rootScope, $location, $http, ProfileService, SettingsService) {

    $rootScope.$on('$routeChangeStart', function(next, current) {
        $rootScope.path = $location.path();
    });

    $rootScope.pageAction = ($location.path() === '/popup');
    $rootScope.profile = ProfileService;
    $rootScope.settings = SettingsService;

    // init dom plugins
    var initDom = function() {

        // init bootstrap elements
        $('[data-toggle=tooltip]').tooltip();
        $('[data-toggle=popover').popover();
        $('.modal').modal({
            show: false
        });

        //put focus on the first text input when opening modals
        $('.modal').on('shown.bs.modal', function() {
            $(this).find('input[type!="hidden"]:first').focus();
        });

        $rootScope.isLoggedIn();
    };

    $rootScope.$on('$viewContentLoaded', initDom);
    $rootScope.$on('$includeContentLoaded', initDom);

    $rootScope.showLogin = function() {
        $('.login-modal').modal('show');
    };

    $rootScope.showRegister = function() {
        $('.register-modal').modal('show');
    };

    $rootScope.checkLogin = function() {
        $('#check-login').removeClass("hide");
    };

    $rootScope.isLoggedIn = function() {
        $http.get(SettingsService.get("apiBaseURL") + "account").success(function(data) {
            $rootScope.profile.user = data;
        });
    };
});

/* TODO
 */
// We no longer need
// * add.html and popup.html templates
// * add controller
