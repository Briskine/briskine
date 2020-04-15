import $ from 'jquery';
import _ from 'underscore';

export default function MembersCtrl ($scope, $rootScope, $timeout, $location, AccountService, MemberService, SubscriptionService) {
    'ngInject';
    $scope.activeTab = 'members';

    $scope.activeSubscription = {
        price: 0,
        users: 1,
        members: 1,
        plan: '',
        percent_off: 0,
        start_datetime: null,
        canceled_datetime: null
    };

    $scope.users = [];
    $scope.newUsers = [];

    $scope.userInviteLoading = false;
    $scope.userLoading = null;
    $scope.userEdit = null;

    function setUserState (status, id) {
        $scope[status] = id || null;
    }

    function setUserLoading (id) {
        return setUserState('userLoading', id);
    }

    function setUserEdit (id) {
        return setUserState('userEdit', id);
    }

    $scope.licensesUsed = 1;

    $scope.showMemberModal = function () {
        $('#add-members-modal').modal();
    };

    $scope.hideMemberModal = function () {
        $('#add-members-modal').modal('hide');
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
                  for (var i = 0; i <= $scope.activeSubscription.users - $scope.licensesUsed - 1; i++) {
                      $scope.newUsers.push({
                          'name': '',
                          'email': ''
                      });
                  }
                }
            });
        };

        // check the active subscription first
        SubscriptionService.getSubscription().then(function (sub) {
            $scope.activeSubscription = sub;
            $scope.users = [];
            getData();
        });
    };

    // setup account
    AccountService.get()
      .then(function(data) { $scope.account = data; })
      .then($scope.refresh);

    $scope.saveMembers = function () {
        $scope.userInviteLoading = true;
        Promise.all($scope.newUsers.map((u) => {
            if (!(u.name && u.email)) {
                return;
            }

            return MemberService.update(u).then(function () {
                return;
            }, function (errors) {
                $scope.formErrors = errors;
                return;
            });
        })).then(() => {
            $scope.userInviteLoading = false;
            $scope.formErrors = null;
            $('.modal').modal('hide');
            $scope.refresh();
        });
    };

    $scope.toggleMember = function () {
        var user = this.u;
        setUserLoading(user.id);
        MemberService.toggle(user).then(function () {
            $scope.formErrors = null;
            $scope.refresh();
        }, function (errors) {
            $scope.formErrors = errors;
        }).then(() => {
            setUserLoading();
        });
    };

    $scope.edit = function (id) {
        setUserEdit(id);
    };

    $scope.saveMember = function () {
        var member = this.u;
        setUserLoading(member.id);
        MemberService.update(member).then(function () {
            $scope.formErrors = null;
            setUserEdit();
        }, function (errors) {
            $scope.formErrors = errors;
        }).then(() => {
            setUserLoading();
        });
    };

    $scope.isCanceled = function () {
        return SubscriptionService.isCanceled($scope.activeSubscription);
    };
}
