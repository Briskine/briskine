export default function StatsCtrl ($scope, $rootScope, AccountService, StatsService) {
    'ngInject';
    var self = this;
    $scope.activeTab = 'stats';
    $scope.userStats = [];
    $scope.templateStats = [];

    AccountService.get().then(function (account) {
        $scope.account = account;
    });

    StatsService.get().then(function (res) {
        $scope.userStats = res.users;
        $scope.templateStats = res.templates;
    });
}
