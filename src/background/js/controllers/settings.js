gqApp.controller('SettingsCtrl', function($scope, $rootScope, QuicktextService, SettingsService, ProfileService) {

  $scope.tabcompleteEnabled = SettingsService.get('tabcompleteEnabled');
  $scope.autocompleteEnabled = SettingsService.get('autocompleteEnabled');
  $scope.sendStatsEnabled = SettingsService.get('sendStatsEnabled');

});
