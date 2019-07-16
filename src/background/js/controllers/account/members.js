gApp.controller('MembersCtrl', function ($scope, $rootScope, $timeout, AccountService, MemberService, SubscriptionService) {
    $scope.activeTab = 'members';

    $scope.users = [];
    $scope.newUsers = [];

    $scope.sendNotification = true;
    $scope.activeSubscription = null;
    $scope.licensesUsed = 1;

    $scope.showMemberModal = function () {
        $('#add-members-modal').modal();
    };

    $scope.refresh = function () {
        var getData = function () {
            MemberService.members().then(function (data) {
                $scope.users = _.sortBy(data.members, 'active').reverse();
                $scope.newUsers = [];

                $scope.licensesUsed = _.filter(data.members, function (m) {
                    return m.active;
                }).length + 1;

                if ($scope.activeSubscription != null) {
                  for (var i = 0; i <= $scope.activeSubscription.quantity - $scope.licensesUsed - 1; i++) {
                      $scope.newUsers.push({
                          'name': '',
                          'email': ''
                      });
                  }
                }
            });
        };

        if ($scope.account.is_customer) {
            // check the active subscription first
            SubscriptionService.getActiveSubscription().then(function (sub) {
                $scope.activeSubscription = sub;
                $scope.users = [];
                getData();
            });
        } else {
            getData();
        }
    };

    // setup account
    AccountService.get()
      .then(function(data) { $scope.account = data; })
      .then($scope.refresh);

    $scope.saveMembers = function () {
        _.each($scope.newUsers, function (u) {
            if (!(u.name && u.email)) {
                return;
            }
            u.sendNotification = $scope.sendNotification;

            MemberService.update(u).then(function () {
                $scope.formErrors = null;
                $('.modal').modal('hide');
                $scope.refresh();
            }, function (errors) {
                $scope.formErrors = errors;
            });
        });
    };

    $scope.toggleMember = function () {
        var user = this.u;
        MemberService.toggle(user).then(function () {
            $scope.formErrors = null;
            $scope.refresh();
        }, function (errors) {
            $scope.formErrors = errors;
        });
    };

    $scope.edit = function () {
        $(".edit-" + this.u.id).removeClass('hidden').siblings().addClass('hidden');
    };

    $scope.saveMember = function () {
        var member = this.u;

        MemberService.update(member).then(function () {
            $scope.formErrors = null;
            $(".edit-" + member.id).addClass('hidden').siblings().removeClass('hidden');
        }, function (errors) {
            $scope.formErrors = errors;
        });
    };
});
