import angular from 'angular';
import ngRoute from 'angular-route';
import angularMoment from 'angular-moment';
import ngFileUpload from 'ng-file-upload';
import $ from 'jquery';
import 'bootstrap';
import 'selectize';
// creates global Mousetrap
import 'mousetrap';
import 'mousetrap/plugins/record/mousetrap-record',

import 'tinymce';
import 'tinymce/themes/modern';
import 'tinymce/plugins/autoresize';
import 'tinymce/plugins/autolink';
import 'tinymce/plugins/image';
import 'tinymce/plugins/link';
import 'tinymce/plugins/media';
import 'tinymce/plugins/table';
import 'tinymce/plugins/advlist';
import 'tinymce/plugins/lists';
import 'tinymce/plugins/textcolor';
import 'tinymce/plugins/imagetools';
import 'tinymce/plugins/code';

import './utils/amplitude';

import '../css/background.styl';

import Config from './config';
import {ProfileService, SettingsService} from './services/services';
import {FilterTagService, TemplateService} from './services/templates';
import {AccountService, MemberService} from './services/account';
import SubscriptionService from './services/subscription';
import QuicktextSharingService from './services/sharing';
import InstallService from './services/install-templates';
import {gravatar, safe, fuzzy, tagFilter, sharingFilter, newlines, truncate, stripHTML} from './filters';
import SidebarCtrl from './controllers/sidebar';
import LoginCtrl from './controllers/includes/login';
import ForgotCtrl from './controllers/includes/forgot';
import ImportCtrl from './controllers/includes/import';
import ListCtrl from './controllers/list';
import SettingsCtrl from './controllers/settings';
import TemplateFormCtrl from './controllers/includes/template_form';
import ShareFormCtrl from './controllers/includes/share_form';
import InstallCtrl from './controllers/install';

import store from '../../store/store-client';

var gApp = angular.module('gApp', [
    ngRoute,
    angularMoment,
    ngFileUpload,
]);

gApp
.service('FilterTagService', FilterTagService)
.service('TemplateService', TemplateService)
.service('ProfileService', ProfileService)
.service('SettingsService', SettingsService)
.service('SubscriptionService', SubscriptionService)
.service('AccountService', AccountService)
.service('MemberService', MemberService)
.service('QuicktextSharingService', QuicktextSharingService)
.service('InstallService', InstallService)
.filter('gravatar', gravatar)
.filter('safe', safe)
.filter('fuzzy', fuzzy)
.filter('tagFilter', tagFilter)
.filter('sharingFilter', sharingFilter)
.filter('newlines', newlines)
.filter('truncate', truncate)
.filter('stripHTML', stripHTML)
.controller('SidebarCtrl', SidebarCtrl)
.controller('LoginCtrl', LoginCtrl)
.controller('ForgotCtrl', ForgotCtrl)
.controller('ListCtrl', ListCtrl)
.controller('TemplateFormCtrl', TemplateFormCtrl)
.controller('ShareFormCtrl', ShareFormCtrl)
.controller('ImportCtrl', ImportCtrl)
.controller('SettingsCtrl', SettingsCtrl)
.controller('InstallCtrl', InstallCtrl);

gApp.config(function() {
    tinyMCE.baseURL = 'tinymce';
});

gApp.config(function ($routeProvider, $compileProvider, $sceDelegateProvider, $locationProvider) {
    $locationProvider.hashPrefix('');
    $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension):/);
    $sceDelegateProvider.resourceUrlWhitelist([
        'self',
        'https://chrome.gorgias.io/**',
        'https://templates.gorgias.io/**',
        'http://localhost:*/**'
    ]);
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
    $provide.decorator("$exceptionHandler", ["$delegate", "$window", function ($delegate) {
        return function (exception, cause) {
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
gApp.run(function ($rootScope) {
    $rootScope.baseURL = Config.baseURL;
    $rootScope.apiBaseURL = Config.apiBaseURL;
});


gApp.run(function ($rootScope, $location, $timeout, ProfileService, SettingsService, TemplateService, SubscriptionService) {
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

    $rootScope.trustedSignupURL = $rootScope.baseURL + "signup/startup-monthly-usd-1/is_iframe=yes";
    $rootScope.showStats = true;

    SettingsService.get('settings').then(function (settings) {
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

    var browser = "Chrome";
    if (Boolean(navigator.userAgent.match(/OPR\/(\d+)/))) {
        browser = "Opera";
    }

    $rootScope.loadingSubscription = false;

    function reactivateLegacySubscription (params = {}) {
        return store.getPlans().then((data) => {
            return new Promise((resolve) => {
                var handler = StripeCheckout.configure({
                    key: data.stripe_key,
                    token: function (token) {
                        resolve(token);
                    }
                });

                handler.open({
                    name: 'Gorgias',
                    description: params.subscription.quantity + ' x ' + params.subscription.plan,
                    panelLabel: 'Activate your subscription',
                    email: data.email,
                    allowRememberMe: false
                });
            });
        });
    }

    $rootScope.updateFirebaseCreditCard = function (params = {}) {
        var updateUrl = `${params.redirect}?token=${params.token}&customer=${params.customer}`;
        if (params.reactivate === true) {
            updateUrl = `${updateUrl}&reactivate`;
        }

        // stripe checkout must redirect from https.
        // open stripe checkout on api rendered page.
        window.location.href = updateUrl;
    };

    // Get a new token from stripe and send it to the server
    $rootScope.reactivateSubscription = function () {
        $rootScope.loadingSubscription = true;
        var reactivateParams = {
            subscription: $rootScope.currentSubscription
        };

        store.reactivateSubscription(reactivateParams).then((res = {}) => {
            if (res.firebase) {
                return $rootScope.updateFirebaseCreditCard(res);
            }

            return reactivateLegacySubscription(reactivateParams).then((token) => {
                // Use the token to create the charge with server-side.
                SubscriptionService.updateSubscription($rootScope.currentSubscription.id, {
                    token: token
                }).then(
                    function () {
                        $rootScope.checkLoggedIn();

                    }, function (res) {
                        alert('Failed to create new subscription. ' + res);
                    }
                );

                return;
            });
        }).then(() => {
            $rootScope.loadingSubscription = false;
        });
    };

    $rootScope.checkLoggedIn = function () {
        store.getLoginInfo()
        .then(function (data) {
            // force log-out on users migrated to firestore
            if (data.logout) {
                return $rootScope.logOut();
            }

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

                    store.getAccount().then(function (data) {
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
                } else {
                    var identify = new amplitude.Identify().set('browser', browser).set('authenticated', false).set('user', {'email': $rootScope.userEmail});
                    amplitude.getInstance().identify(identify);
                    SettingsService.set("isLoggedIn", false);
                }
            });
        }).catch(function () {
            var identify = new amplitude.Identify().set('$browser', browser).set('authenticated', false).set('user', {'email': $rootScope.userEmail});
            amplitude.getInstance().identify(identify);
            SettingsService.set("isLoggedIn", false);
        });
    };

    // logout function
    $rootScope.logOut = function () {
        store.logout()
        .then(function () {
            SettingsService.set('isLoggedIn', false).then(() => {
                // force home redirect
                window.location.href = '#/';
                window.location.reload(true);
            });
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

    $rootScope.checkLoggedIn();

    // Setup recurring syncing interval
    var syncInterval = 100 * 1000;
    window.setInterval(store.syncNow, syncInterval);
    store.syncNow();

    store.on('templates-sync', function () {
        $rootScope.$broadcast("templates-sync");
    });

    $rootScope.$on('$viewContentLoaded', initDom);
    $rootScope.$on('$includeContentLoaded', initDom);

    function subscribeIframeLoaded (e) {
        var iframe = e.target;
        var loadingClass = 'btn-loading';
        var loaderSelector = `.${loadingClass}`;
        var loader = iframe.closest(loaderSelector);
        loader.classList.remove(loadingClass);

        iframe.removeEventListener('load', subscribeIframeLoaded);
    }

    function openSubscribePopup () {
        var subscribeUrl = `${Config.functionsUrl}/subscribe/`;
        var $modal = $('#firestore-signup-modal');
        var iframe = $modal.find('iframe').get(0);
        $modal.modal({
            show: true
        });

        if (iframe.src !== subscribeUrl) {
            iframe.addEventListener('load', subscribeIframeLoaded);
            iframe.src = subscribeUrl;
        }
    }

    $rootScope.openSubscribe = () => {
        openSubscribePopup();
    };

    $rootScope.firestoreEnabled = window.FIRESTORE_ENABLED();
});
