gApp.controller('AccountCtrl', function ($scope, $rootScope, $timeout, AccountService) {
    $scope.activeTab = 'account';

    AccountService.get().then(function(data){ $scope.account = AccountService.user; console.log($scope.account); });

    $scope.saveAccount = function () {
        mixpanel.track("Saved Account Settings");
        AccountService.update($scope.account).then(function () {
            $(".updated-account-message").removeClass("hide");
        });
    };
});
