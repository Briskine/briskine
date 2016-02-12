gApp.controller('GroupsCtrl', function ($scope, $rootScope, $timeout, MemberService, GroupService, GroupAppsService, AccountService) {
    $scope.activeTab = 'groups';

    AccountService.get().then(function(data){ $scope.account = AccountService.user; });

    $scope.members = [];
    $scope.appsUsers = [];

    $scope.groups = [];
    $scope.appsGroups = [];
    $scope.newUsers = [];

    var defaultGroup = {
        'name': '',
        'desc': '',
        'members': []
    };

    $scope.selectedGroup = angular.copy(defaultGroup);

    $scope.sendNotification = true;

    $scope.showGroupModal = function () {
        $scope.selectedGroup = angular.copy(defaultGroup);
        $scope.selectedGroup.members = angular.copy($scope.members);

        $('#add-groups-modal').modal();
    };

    $scope.showGroupAppsModal = function () {
        $('#add-groups-apps-modal').modal();
    };

    $scope.refresh = function () {
        MemberService.members().then(function (data) {
            $scope.members = data.members;

            for (var i = 0; i < $scope.members.length; i++) {
              $scope.members[i].selected = false;
            }

            $scope.groups = data.groups;
            $scope.appsGroups = data.apps_groups;
            $scope.appsUsers = data.apps_users;

            $scope.selectedGroup.members = angular.copy($scope.members);
        });
    };
    $scope.refresh();

    $scope.saveGroup = function () {
        mixpanel.track("Add member group");

        GroupService.update($scope.selectedGroup).then(function () {
            $scope.formErrors = null;
            $('.modal').modal('hide');
            $scope.refresh();
        }, function (errors) {
            $scope.formErrors = errors;
        });
    };

    $scope.saveGroupsApps = function () {
        mixpanel.track("Import group from Google Apps");

        GroupAppsService.import($scope.appsGroups, $scope.sendNotification).then(function () {
            $scope.formErrors = null;
            $('.modal').modal('hide');
            $scope.refresh();
        }, function (errors) {
            $scope.formErrors = errors;
        });
    };

    $scope.editGroup = function () {
        $scope.showGroupModal();

        $scope.selectedGroup.id = this.g.id;
        $scope.selectedGroup.name = this.g.name;
        $scope.selectedGroup.desc = this.g.desc;
        $scope.selectedGroup.members = angular.copy($scope.members);

        // for the initial group form populate with users
        for (var i in $scope.selectedGroup.members) {
            var m = $scope.selectedGroup.members[i];
            m.selected = false;

            for (var j in this.g.users) {
                var u = this.g.users[j];
                if (u.user_id === m.user_id) {
                    m.selected = true;
                    break;
                }
            }
        }
    };

    $scope.deleteGroup = function () {
        if (confirm("Are you sure you want to delete this group? No members will be deleted as a result.")) {
            mixpanel.track("Deleted Member Group");
            GroupService.delete(this.g).then(function () {
                $scope.refresh();
            });
        }
    };

});
