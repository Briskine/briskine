gApp.controller('AccountCtrl', function ($scope, $rootScope, $timeout, AccountService) {
    $scope.activeTab = 'account';

    AccountService.get().then(function(data){ $scope.account = data; });

    $scope.saveAccount = function () {
        AccountService.update($scope.account).then(function () {
            $(".updated-account-message").removeClass("hide");
        });
    };
});
