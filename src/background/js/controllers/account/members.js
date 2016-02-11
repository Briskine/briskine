gApp.controller('MembersCtrl', function ($scope, $rootScope, $timeout, AccountService, MemberService, SubscriptionService) {
    $scope.activeTab = 'members';

    $scope.users = [];
    $scope.appsUsers = [];

    $scope.newUsers = [];

    $scope.sendNotification = true;
    $scope.activeSubscription = null;
    $scope.licensesUsed = 1;

    $scope.showMemberModal = function () {
        $('#add-members-modal').modal();
    };

    $scope.showMemberAppsModal = function () {
        $('#add-members-apps-modal').modal();
    };


    $scope.refresh = function () {
        var getData = function () {
            MemberService.members().then(function (data) {
                $scope.users = _.sortBy(data.members, 'active').reverse();
                $scope.appsUsers = data.apps_users;
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
        mixpanel.track("Add team members");

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

        _.each($scope.appsUsers, function (u) {
            if (!(u.active && u.name && u.email)) {
                return;
            }
            u.id = null;
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
        mixpanel.track("Toggle member", {enabled: user.active});
        MemberService.toggle(user).then(function () {
            $scope.formErrors = null;
            $scope.refresh();
        }, function (errors) {
            $scope.formErrors = errors;
        });
    };

    $scope.deleteMember = function () {
        if (confirm("Are you sure you want to delete this member from your team?")) {
            mixpanel.track("Deleted Member");
            MemberService.delete(this.member).then(function () {
                $scope.refresh();
            });
        }
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
