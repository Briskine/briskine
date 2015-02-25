mixpanel.init("f1afffc82208d20529daf9cc527b29a1");

Raven.config('https://af2f5e9fb2744c359c19d08c8319d9c5@app.getsentry.com/30379', {
    tags: {
        version: chrome.runtime.getManifest().version
    },
    linesOfContext: 11,
    fetchContext: true,
    collectWindowErrors: true
}).install();

var gqApp = angular.module('gqApp', [
    'ngRoute',
    'ngResource',
    'ngAnimate',
    'angular-md5',
    'angularMoment',
    'textAngular'
]).config(function ($routeProvider, $compileProvider) {

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
        .when('/installed', {
            templateUrl: 'views/installed.html',
            reloadOnSearch: false
        })
        .otherwise({
            redirectTo: '/list'
        });
});


gqApp.config(["$provide", function ($provide) {
    $provide.decorator("$exceptionHandler", ["$delegate", "$window", function ($delegate, $window) {
        return function (exception, cause) {
            Raven.captureException(exception);
            // (Optional) Pass the error through to the delegate formats it for the console
            $delegate(exception, cause);
        };
    }]);

}]);

/* Global run
 */
gqApp.run(function ($rootScope, $location, $http, $timeout, ProfileService, SettingsService, QuicktextService) {

    $rootScope.$on('$routeChangeStart', function (next, current) {
        $rootScope.path = $location.path();
    });
    $rootScope.pageAction = ($location.path() === '/popup');


    SettingsService.get('baseURL').then(function(baseURL){
        $rootScope.baseURL = baseURL;
    });

    // disable mixpanel if stats are not enabled
    SettingsService.get('settings').then(function (settings) {
        if (!settings.stats.enabled) {
            mixpanel.disable();
        }
    });

    // setup profile
    $rootScope.profile = {};
    $rootScope.profileService = ProfileService;
    ProfileService.savedTime().then(function(savedTime){
        $rootScope.profile.savedTime = savedTime;
    });

    ProfileService.words().then(function(words){
        $rootScope.profile.savedWords = ProfileService.reduceNumbers(words);
    });

    $rootScope.checkLogin = function () {
        $('#check-login').removeClass("hide");
    };

    $rootScope.isLoggedIn = function () {
        SettingsService.get("apiBaseURL").then(function (apiBaseURL) {
            $http.get(apiBaseURL + 'login-info').success(function (data) {
                SettingsService.set("isLoggedIn", data.is_loggedin).then(function () {
                    if (data.is_loggedin) {
                        $http.get(apiBaseURL + "account").success(function (data) {
                            $rootScope.profile.user = data;
                        });
                    }
                });
            });
        });
    };

    // last sync date
    $rootScope.lastSync = QuicktextService.lastSync;

    $rootScope.SyncNow = function () {
        QuicktextService.sync(function (lastSync) {
            $rootScope.$broadcast("quicktexts-sync");
            $rootScope.lastSync = lastSync;
        });
    };

    // init dom plugins
    var initDom = function () {

        // init bootstrap elements
        $('[data-toggle=tooltip]').tooltip();
        $('[data-toggle=popover]').popover();
        $('.modal').modal({
            show: false
        });

        //put focus on the first text input when opening modals
        $('.modal').on('shown.bs.modal', function () {
            $(this).find('input[type!="hidden"]:first').focus();
        });

        $rootScope.isLoggedIn();
    };

    $rootScope.$on('$viewContentLoaded', initDom);
    $rootScope.$on('$includeContentLoaded', initDom);

});
