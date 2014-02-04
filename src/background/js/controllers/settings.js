gqApp.controller('SettingsCtrl', function ($scope, $rootScope, QuicktextService, SettingsService, ProfileService) {

    $scope.tabcompleteEnabled = SettingsService.get('tabcompleteEnabled');
    $scope.autocompleteEnabled = SettingsService.get('autocompleteEnabled');
    $scope.autocompleteDelay = SettingsService.get('autocompleteDelay');
    $scope.sendStatsEnabled = SettingsService.get('sendStatsEnabled');

});
