ravenInit({
    whitelistUrls: [
        /https:\/\/mail\.google\.com/,
        /https:\/\/inbox\.google\.com/,
        /https:\/\/.*mail\.yahoo\.com/,
        /https:\/\/.*mail\.live\.com/,
        /https:\/\/.*outlook\.live\.com/,
        /https:\/\/.*linkedin\.com/,
        /https:\/\/.*fastmail\.com/,
        /chrome-extension:\/\/jcaagnkpclhhpghggjoemjjneoimjbid/, // chrome
        /chrome-extension:\/\/ammheiinddkagoaegldpipmmjfoggahh/ // opera
    ]
});

var gApp = angular.module('gApp', [
    'ngRoute',
    'ngResource',
    'angularMoment',
    'checklist-model',
    'ngFileUpload'
]);

gApp.config(function() {
    tinyMCE.baseURL = 'tinymce';
});

gApp.config(function ($routeProvider, $compileProvider, $sceDelegateProvider) {
    $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension):/);
    $sceDelegateProvider.resourceUrlWhitelist(['self', 'https://chrome.gorgias.io/**', 'http://localhost:*/**']);
    $routeProvider
        .when('/list', {
            controller: 'ListCtrl',
            templateUrl: 'views/list.html',
            reloadOnSearch: false,
            resolve: {
                properties: function () {
                    return {list: 'all'};
                }
            }
        })
        .when('/list/private', {
            controller: 'ListCtrl',
            templateUrl: 'views/list.html',
            reloadOnSearch: false,
            resolve: {
                properties: function () {
                    return {list: 'private'};
                }
            }
        })
        .when('/list/shared', {
            controller: 'ListCtrl',
            templateUrl: 'views/list.html',
            reloadOnSearch: false,
            resolve: {
                properties: function () {
                    return {list: 'shared'};
                }
            }
        })
        .when('/list/tag', {
            controller: 'ListCtrl',
            templateUrl: 'views/list.html',
            reloadOnSearch: false,
            resolve: {
                properties: function () {
                    return {list: 'tag'};
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
        .when('/account/stats', {
            controller: 'StatsCtrl',
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

gApp.config(['$compileProvider', function ($compileProvider) {
    if (ENV && ENV === 'production') {
        $compileProvider.debugInfoEnabled(false);
    }
}]);

/* Global run
 */
gApp.run(function ($rootScope, $location, $http, $timeout, ProfileService, SettingsService, TemplateService, SubscriptionService) {
    $rootScope.$on('$routeChangeStart', function () {
        $rootScope.path = $location.path();
    });

    var userAgent = window.navigator.userAgent;
    $rootScope.isOpera = /OPR/g.test(userAgent);
    $rootScope.isChrome = /chrome/i.test(userAgent);

    $rootScope.userEmail = '';
    $rootScope.savedEmail = false;
    $rootScope.loginChecked = false;
    $rootScope.isLoggedIn = false;
    $rootScope.isCustomer = null;
    $rootScope.currentSubscription = null;
    $rootScope.baseURL = Settings.defaults.baseURL;
    $rootScope.apiBaseURL = Settings.defaults.apiBaseURL;

    $rootScope.trustedSignupURL = $rootScope.baseURL + "signup/startup-monthly-usd-1/is_iframe=yes";
    $rootScope.showStats = true;

    SettingsService.get('settings').then(function (settings) {
        if (ENV && ENV === 'production') {
            amplitude.getInstance().init("e50d000bcba1aa363cd1f71642ed466a", {
                saveEvents: false // don't store in localStorage the events - it slows down everything
            });
        } else if (ENV && ENV === 'development') {
            amplitude.getInstance().init("a31babba9c8dedf2334c44d8acdad247", {
                saveEvents: false // don't store in localStorage the events - it slows down everything
            });
        }

        // Make sure that we have all the defaults
        SettingsService.set('settings', _.defaults(settings, Settings.defaults.settings));

        // disable amplitude if stats are not enabled
        if (!settings.stats.enabled) {
            amplitude.getInstance().setOptOut(true);
        }

        if (settings.userEmail) {
            $rootScope.userEmail = settings.userEmail;
            $rootScope.savedEmail = true;
        }
    });

    $rootScope.signupURL = function () {
        // only provide an URL if the user is not authenticated
        // this will prevent the iframe from loading for authenticated users
        if ($rootScope.loginChecked && !$rootScope.isLoggedIn) {
            return $rootScope.trustedSignupURL;
        }
        return '';
    };

    $rootScope.trackSignup = function (source) {
        amplitude.getInstance().logEvent("Opened Signup form", {
            'source': source
        });
    };

    $rootScope.profileService = ProfileService;
    $rootScope.profile = {};
    // setup profile
    ProfileService.savedTime().then(function (savedTime) {
        $rootScope.profile.savedTime = savedTime;
    });

    ProfileService.words().then(function (words) {
        $rootScope.profile.savedWords = words;
        $rootScope.profile.savedWordsNice = ProfileService.reduceNumbers(words);
    });

    $rootScope.connectSocial = function (provider, scope) {
        var url = $rootScope.baseURL + 'authorize/' + provider;
        $http.post(url, {'scope': scope}).success(function (res) {
            window.location = res.location;
        }).error(function () {
            alert("Error! We're unable to authorize : " + provider + ". Please try again or contact chrome@gorgias.io");
        });
    };

    var browser = "Chrome";
    if (Boolean(navigator.userAgent.match(/OPR\/(\d+)/))) {
        browser = "Opera";
    }

    // Get a new token from stripe and send it to the server
    $rootScope.reactivateSubscription = function () {
        SubscriptionService.plans().then(function (data) {
            var handler = StripeCheckout.configure({
                key: data.stripe_key,
                image: '/static/img/icon128.png',
                token: function (token) {
                    // Use the token to create the charge with server-side.
                    SubscriptionService.updateSubscription($rootScope.currentSubscription.id, {token: token}).then(
                        function () {
                            $rootScope.checkLoggedIn();
                        }, function (res) {
                            alert('Failed to create new subscription. ' + res);
                        }
                    );
                }
            });
            handler.open({
                name: 'Gorgias',
                description: $rootScope.currentSubscription.quantity + ' x ' + $rootScope.currentSubscription.plan,
                panelLabel: 'Activate your subscription',
                email: data.email,
                allowRememberMe: false
            });
        });
    };

    $rootScope.checkLoggedIn = function () {
        SettingsService.get("apiBaseURL").then(function (apiBaseURL) {
            $http.get(apiBaseURL + 'login-info').success(function (data) {
                $rootScope.loginChecked = true;
                if (data.is_loggedin) {
                    $rootScope.isLoggedIn = true;
                }

                SettingsService.set("isLoggedIn", data.is_loggedin).then(function () {
                    if (data.is_loggedin) {
                        if (!data.editor.enabled) { // disable editor if disabled server side
                            SettingsService.get("settings").then(function (settings) {
                                settings.editor = data.editor;
                                SettingsService.set("settings", settings);
                            });
                        }

                        $http.get(apiBaseURL + "account").success(function (data) {
                            $rootScope.currentSubscription = data.current_subscription;
                            $rootScope.isCustomer = data.is_customer;

                            // identify people that are logged in to our website
                            amplitude.getInstance().setUserId(data.id);

                            amplitude.getInstance().setUserProperties({
                                "email": data.email,
                                "created": data.created_datetime,
                                "name": data.info.name,
                                "sub_active": data.current_subscription.active || false,
                                "sub_created": data.current_subscription.created_datetime,
                                "sub_plan": data.current_subscription.plan,
                                "sub_quantity": data.current_subscription.quantity,
                                "is_customer": data.is_customer,
                                "is_staff": data.is_staff
                            });


                            var identify = new amplitude.Identify().set('browser', browser).set('authenticated', true).set('user', data);
                            amplitude.getInstance().identify(identify);

                        });
                        // Once logged in start syncing
                        $rootScope.SyncNow();
                    } else {
                        var identify = new amplitude.Identify().set('browser', browser).set('authenticated', false).set('user', {'email': $rootScope.userEmail});
                        amplitude.getInstance().identify(identify);
                        SettingsService.set("isLoggedIn", false);
                    }
                });
            }).error(function () {
                var identify = new amplitude.Identify().set('$browser', browser).set('authenticated', false).set('user', {'email': $rootScope.userEmail});
                amplitude.getInstance().identify(identify);
                SettingsService.set("isLoggedIn", false);
            });
        });
    };

    // logout function
    $rootScope.logOut = function () {
        $http({
            method: 'GET',
            url: Settings.defaults.baseURL + 'logout'
        }).then(function () {
            SettingsService.set('isLoggedIn', false).then(location.reload(true));
        });
    };

    // last sync date
    $rootScope.lastSync = TemplateService.lastSync;

    $rootScope.SyncNow = function () {
        var inList = $location.path().indexOf('/list') !== -1;
        if (!inList) {
            // only sync when in list
            return;
        }
        SettingsService.get("isLoggedIn").then(function (isLoggedIn) {
            if (!isLoggedIn) {
                return;
            }

            TemplateService.sync().then(function (lastSync) {
                console.log("Synced: ", new Date().toUTCString());
                var waitForLocal = function () {
                    $rootScope.$broadcast("templates-sync");
                    $rootScope.lastSync = lastSync;
                    TemplateService.syncLocal();
                };
                // wait a bit before doing the local sync
                setTimeout(waitForLocal, 1000);
            });
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

    $rootScope.checkLoggedIn();

    $rootScope.$on('$viewContentLoaded', initDom);
    $rootScope.$on('$includeContentLoaded', initDom);

});
