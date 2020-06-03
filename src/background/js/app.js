/* globals ENV */
import angular from 'angular';
import ngRoute from 'angular-route';
import angularMoment from 'angular-moment';
import ngFileUpload from 'ng-file-upload';
import $ from 'jquery';
import 'bootstrap';
import 'selectize';
// creates global Mousetrap
import 'mousetrap';
import 'mousetrap/plugins/record/mousetrap-record';

import tinyMCE from 'tinymce';
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

import exportTemplates from './utils/export-templates';

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
import ImportCtrl from './controllers/includes/import';
import ListCtrl from './controllers/list';
import SettingsCtrl from './controllers/settings';
import TemplateFormCtrl from './controllers/includes/template_form';
import ShareFormCtrl from './controllers/includes/share_form';
import InstallCtrl from './controllers/install';
import AccountCtrl from './controllers/account/account';
import MembersCtrl from './controllers/account/members';
import SubscriptionsCtrl from './controllers/account/subscriptions';
import fileread from './directives/fileread';
import subscriptionActive from './subscription/subscription-active';
import subscriptionUsers from './subscription/subscription-users';
import subscriptionCancel from './subscription/subscription-cancel';
import subscriptionPremium from './subscription/subscription-premium';
import subscriptionCanceledNotice from './subscription/subscription-canceled-notice';
import subscriptionHint from './subscription/subscription-hint';
import login from './login/login';
import forgot from './login/forgot';

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
.controller('ListCtrl', ListCtrl)
.controller('TemplateFormCtrl', TemplateFormCtrl)
.controller('ShareFormCtrl', ShareFormCtrl)
.controller('ImportCtrl', ImportCtrl)
.controller('SettingsCtrl', SettingsCtrl)
.controller('InstallCtrl', InstallCtrl)
.controller('AccountCtrl', AccountCtrl)
.controller('MembersCtrl', MembersCtrl)
.controller('SubscriptionsCtrl', SubscriptionsCtrl)
.directive('fileread', fileread)
.component('subscriptionActive', subscriptionActive)
.component('subscriptionUsers', subscriptionUsers)
.component('subscriptionCancel', subscriptionCancel)
.component('subscriptionPremium', subscriptionPremium)
.component('subscriptionCanceledNotice', subscriptionCanceledNotice)
.component('subscriptionHint', subscriptionHint)
.component('login', login)
.component('forgot', forgot);

gApp.config(function() {
    tinyMCE.baseURL = 'tinymce';
});

gApp.config(function ($routeProvider, $compileProvider, $sceDelegateProvider, $locationProvider) {
    'ngInject';

    $locationProvider.hashPrefix('');
    $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension):/);
    $sceDelegateProvider.resourceUrlWhitelist([
        'self',
        'http://localhost:*/**',
        `${Config.websiteUrl}/**`
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
gApp.run(function ($rootScope, $location, $timeout, ProfileService, SettingsService, TemplateService) {
    'ngInject';

    $rootScope.$on('$routeChangeStart', () => {
        $rootScope.path = $location.path();
    });

    var userAgent = window.navigator.userAgent;
    $rootScope.isOpera = /OPR/g.test(userAgent);
    $rootScope.isChrome = /chrome/i.test(userAgent);

    $rootScope.userEmail = '';
    $rootScope.savedEmail = false;
    $rootScope.isLoggedIn = null;
    $rootScope.isCustomer = null;
    $rootScope.currentSubscription = null;

    $rootScope.showStats = true;

    SettingsService.get('settings').then(function (settings) {
        if (settings.userEmail) {
            $rootScope.userEmail = settings.userEmail;
            $rootScope.savedEmail = true;
        }
    });

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

    $rootScope.checkLoggedIn = function () {
        store.getLoginInfo()
        .then(function () {
            $rootScope.isLoggedIn = true;
            SettingsService.set("isLoggedIn", true);

            store.getAccount().then(function (data) {
                $rootScope.currentSubscription = data.current_subscription;
                $rootScope.isCustomer = data.is_customer;
            });
        }).catch(function () {
            $rootScope.isLoggedIn = false;
            SettingsService.set("isLoggedIn", false);
            return;
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

    // sync local data
    store.syncNow();

    store.on('templates-sync', function () {
        $rootScope.$broadcast("templates-sync");
    });

    store.on('subscribe-success', () => {
        window.location.reload();
    });

    $rootScope.$on('$viewContentLoaded', initDom);
    $rootScope.$on('$includeContentLoaded', initDom);

    $rootScope.openSubscribe = () => {
        SettingsService.get('isLoggedIn').then((loggedIn) => {
            if (loggedIn) {
                // if authenticated, go to subscriptions
                $location.path('/account/subscriptions');
                return;
            }

            // if not, open pricing
            window.open(`${Config.websiteUrl}/pricing`);
        });
    };

    $rootScope.firestoreEnabled = window.FIRESTORE_ENABLED();

    $rootScope.exportTemplates = function () {
        TemplateService.quicktexts().then(function (templates) {
            exportTemplates(templates);
        });
    };
});
