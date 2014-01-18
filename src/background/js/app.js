/* Quicktext chrome extension
 */

var gqApp = angular.module('gqApp', [
  'ngRoute',
  'ngAnimate',
  'angular-md5'
]).config(function ($routeProvider) {
  
    $routeProvider
        .when('/list', {
            controller: 'ListCtrl',
            templateUrl: 'views/quicktexts.html'
        })
        .when('/settings', {
            controller: 'SettingsCtrl',
            templateUrl: 'views/settings.html'
        })
        .when('/dialog', {
            controller: 'DialogCtrl',
            templateUrl: 'views/dialog.html'
        })
        .when('/popup', {
            controller: 'PopupCtrl',
            templateUrl: 'views/popup.html'
        })
        .otherwise({
          redirectTo: '/list'
        });
});

/* Global run
 */
gqApp.run(function ($rootScope, $location, ProfileService, SettingsService) {

  $rootScope.$on('$routeChangeStart', function(next, current) {
    $rootScope.path = $location.path();
  });

  $rootScope.profile = ProfileService;
  $rootScope.settings = SettingsService;

  $rootScope.$on('$viewContentLoaded', function(event) {
    $("[data-toggle=tooltip]").tooltip();
    $("[data-toggle=popover").popover();
  });

  $rootScope.$on('$includeContentLoaded', function(event) {
    $("[data-toggle=tooltip]").tooltip();
    $("[data-toggle=popover").popover();
  });

});
