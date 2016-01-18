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
    'ngMd5',
    'angularMoment',
    'checklist-model',
    'ngFileUpload'
]);

gApp.config(function ($routeProvider, $compileProvider) {
    $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension):/);
    $routeProvider
        .when('/list', {
            controller: 'ListCtrl',
            templateUrl: 'views/list.html',
            reloadOnSearch: false,
            resolve: {
              properties: function() {
                return { list: 'all' };
              }
            }
        })
        .when('/list/private', {
            controller: 'ListCtrl',
            templateUrl: 'views/list.html',
            reloadOnSearch: false,
            resolve: {
              properties: function() {
                return { list: 'private' };
              }
            }
        })
        .when('/list/shared', {
            controller: 'ListCtrl',
            templateUrl: 'views/list.html',
            reloadOnSearch: false,
            resolve: {
              properties: function() {
                return { list: 'shared' };
              }
            }
        })
        .when('/settings', {
            controller: 'SettingsCtrl',
            templateUrl: 'views/account/base.html'
        })
        .when('/account', {
            controller: 'AccountCtrl',
            templateUrl: 'views/account/base.html'
        })
        .when('/account/members', {
            controller: 'MembersCtrl',
            templateUrl: 'views/account/base.html'
        })
        .when('/account/groups', {
            controller: 'GroupsCtrl',
            templateUrl: 'views/account/base.html'
        })
        .when('/account/subscriptions', {
            controller: 'SubscriptionsCtrl',
            templateUrl: 'views/account/base.html'
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
            if (ENV === 'production') {
                Raven.captureException(exception);
            }
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

    var userAgent = window.navigator.userAgent;
    $rootScope.isOpera = /OPR/g.test(userAgent);
    $rootScope.isChrome = /chrome/i.test(userAgent);

    $rootScope.userEmail = '';
    $rootScope.savedEmail = false;
    $rootScope.baseURL = Settings.defaults.baseURL;
    $rootScope.apiBaseURL = Settings.defaults.apiBaseURL;

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

    $rootScope.profileService = ProfileService;

    $rootScope.connectSocial = function(provider, scope) {
        url = $rootScope.baseURL + 'authorize/' + provider;
        $http.post(url, {'scope': scope}).success(function(res){
            window.location = res.location;
        }).error(function(){
            alert("Error! We're unable to authorize : " + provider + ". Please try again or contact support@gorgias.io");
        });
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
                        if (!data.editor.enabled){ // disable editor if disabled server side
                            SettingsService.get("settings").then(function(settings){
                                settings.editor = data.editor;
                                SettingsService.set("settings", settings);
                            });
                        }

                        $http.get(apiBaseURL + "account").success(function (data) {
                            // identify people that are logged in to our website
                            mixpanel.identify(data.id);
                            mixpanel.people.set({
                                "$email": data.email,
                                "$created": data.created_datetime,
                                "$first_name": data.info.first_name,
                                "$last_name": data.info.last_name,
                                "sub_active": data.active_subscription.active,
                                "sub_created": data.active_subscription.created_datetime,
                                "sub_plan": data.active_subscription.plan,
                                "sub_quantity": data.active_subscription.quantity,
                                "is_customer": data.is_customer,
                                "is_staff": data.is_staff
                            });

                            mixpanel.register({
                                "$browser": browser,
                                authenticated: true,
                                user: data
                            });
                        });
                        // Once logged in start syncing
                        $rootScope.SyncNow();
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
        TemplateService.sync().then(function (lastSync) {
            console.log("Synced: ", new Date().toUTCString());
            var waitForLocal = function(){
                $rootScope.$broadcast("templates-sync");
                $rootScope.lastSync = lastSync;
                TemplateService.syncLocal();
            };
            // wait a bit before doing the local sync
            setTimeout(waitForLocal, 1000);
        });
    };

    // Setup recurring syncing interval
    var syncInterval = 30 * 1000;

    window.setInterval($rootScope.SyncNow, syncInterval);

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
