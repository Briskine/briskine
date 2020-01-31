export default function AccountCtrl ($scope, $rootScope, $timeout, AccountService) {
    'ngInject';
    $scope.activeTab = 'account';

    AccountService.get().then(function(data){ $scope.account = data; });

    $scope.saveAccount = function () {
        AccountService.update($scope.account).then(function () {
            $(".updated-account-message").removeClass("hide");
        });
    };
}
