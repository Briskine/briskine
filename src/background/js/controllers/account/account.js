gApp.controller('AccountCtrl', function ($scope, $rootScope, $timeout, AccountService) {
    $scope.activeTab = 'account';
    AccountService.get().then(function(data) { $scope.profile = data; });

    $scope.saveAccount = function () {
        mixpanel.track("Saved Account Settings");
        AccountService.update($rootScope.profile).then(function () {
            $(".updated-account-message").removeClass("hide");
        });
    };
});
