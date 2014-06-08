gqApp.controller('SettingsCtrl', function ($scope, $rootScope, QuicktextService, SettingsService, ProfileService) {

    $scope.tabcompleteEnabled = SettingsService.get('tabcompleteEnabled');
    $scope.autocompleteEnabled = SettingsService.get('autocompleteEnabled');
    $scope.autocompleteDelay = SettingsService.get('autocompleteDelay');
    $scope.sendStatsEnabled = SettingsService.get('sendStatsEnabled');

    // Delete all quicktexts. This will not delete the quicktexts on the server side
    $scope.deleteAll = function () {
        var r = confirm("Are you sure you want to delete all Quicktexts?\n\nNote: they will NOT be deleted from the sync server.");
        if (r === true) {
            QuicktextService.deleteAll().then();
        }
    };

});
