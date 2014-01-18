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

gqApp.run(function ($rootScope, $location) {

  $rootScope.$on('$routeChangeStart', function(next, current) {
    $rootScope.path = $location.path();
  });

});
