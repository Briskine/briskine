mixpanel.init("f1afffc82208d20529daf9cc527b29a1");

Raven.config('https://af2f5e9fb2744c359c19d08c8319d9c5@app.getsentry.com/30379', {
    tags: {
        version: chrome.runtime.getManifest().version
    },
    whitelistUrls: [
        /https:\/\/mail\.google\.com/,
        /https:\/\/.*mail\.yahoo\.com/,
        /https:\/\/.*mail\.live\.com/,
        /https:\/\/.*linkedin\.com/,
        /https:\/\/.*fastmail\.com/,
        /chrome-extension:\/\/jcaagnkpclhhpghggjoemjjneoimjbid/, // chrome
        /chrome-extension:\/\/ammheiinddkagoaegldpipmmjfoggahh/ // opera
    ],
    linesOfContext: 11,
    fetchContext: true,
    collectWindowErrors: true
}).install();

var gApp = angular.module('gApp', [
    'ngRoute',
    'ngResource',
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


gApp.config(["$provide", function ($provide) {
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
gApp.run(function ($rootScope, $location, $http, $timeout, ProfileService, SettingsService, TemplateService) {

    $rootScope.$on('$routeChangeStart', function (next, current) {
        $rootScope.path = $location.path();
    });
    $rootScope.pageAction = ($location.path() === '/popup');


    SettingsService.get('baseURL').then(function (baseURL) {
        $rootScope.baseURL = baseURL;
    });

    $rootScope.userEmail = '';
    $rootScope.savedEmail = false;

    SettingsService.get('settings').then(function (settings) {
        // Make sure that we have all the default
        var keys = Object.keys(settings);
        var changed = false;
        for (var key in Settings.defaults.settings) {
            if (keys.indexOf(key) === -1) {
                settings[key] = Settings.defaults.settings[key];
                changed = true;
            }
        }
        if (changed) {
            SettingsService.set('settings', settings);
        }


        // disable mixpanel if stats are not enabled
        if (!settings.stats.enabled) {
            mixpanel.disable();
        }

        if (settings.userEmail) {
            $rootScope.userEmail = settings.userEmail;
            $rootScope.savedEmail = true;
        }
    });

    // setup profile
    $rootScope.profile = {};
    $rootScope.profileService = ProfileService;
    ProfileService.savedTime().then(function (savedTime) {
        $rootScope.profile.savedTime = savedTime;
    });

    ProfileService.words().then(function (words) {
        $rootScope.profile.savedWords = ProfileService.reduceNumbers(words);
    });

    $rootScope.checkLogin = function () {
        $('#check-login').removeClass("hide");
    };

    var browser = "Chrome";
    if (Boolean(navigator.userAgent.match(/OPR\/(\d+)/))) {
        browser = "Opera";
    }

    $rootScope.isLoggedIn = function () {
        SettingsService.get("apiBaseURL").then(function (apiBaseURL) {
            $http.get(apiBaseURL + 'login-info').success(function (data) {
                SettingsService.set("isLoggedIn", data.is_loggedin).then(function () {
                    if (data.is_loggedin) {
                        $http.get(apiBaseURL + "account").success(function (data) {
                            $rootScope.profile.user = data;
                            mixpanel.register({
                                "$browser": browser,
                                authenticated: true,
                                user: data
                            });
                        });
                        // Once logged in, upload the local templates
                        TemplateService.syncLocal();
                    } else {
                        mixpanel.register({
                            "$browser": browser,
                            authenticated: false,
                            user: {
                                'email': $rootScope.userEmail
                            }
                        });
                        SettingsService.set("isLoggedIn", false);
                    }
                });
            }).error(function () {
                mixpanel.register({
                    "$browser": browser,
                    authenticated: false,
                    user: {
                        'email': $rootScope.userEmail
                    }
                });
                SettingsService.set("isLoggedIn", false);
            });
        });
    };

    // last sync date
    $rootScope.lastSync = TemplateService.lastSync;

    $rootScope.SyncNow = function () {
        TemplateService.sync(function (lastSync) {
            $rootScope.$broadcast("quicktexts-sync");
            $rootScope.lastSync = lastSync;
        });
    };

    $rootScope.saveEmail = function () {
        var req = {
            method: 'POST',
            url: "https://docs.google.com/forms/d/1Z2vVKT_fNVrWWkvnnT-L1Mry3bsTIxZYlXfYwmbcigM/formResponse",
            params: {
                'entry.1617944603': $rootScope.userEmail
            }
        };
        $http(req).success(function(){
            SettingsService.get('settings').then(function(settings){
                settings.userEmail = $rootScope.userEmail;
                SettingsService.set('settings', settings).then(function(){
                    $rootScope.showEmailAwesome = true;
                });
            });
        }).error( function(){
            $rootScope.showEmailAwesome = false;
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

    };

    $rootScope.isLoggedIn();

    $rootScope.$on('$viewContentLoaded', initDom);
    $rootScope.$on('$includeContentLoaded', initDom);

});
