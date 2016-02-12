gApp.controller('ShareFormCtrl',
    function ($route, $q, $scope, $rootScope, $routeParams) {

        var self = this;
        self.sharing_setting = 'specific';
        self.send_email = 'false';

        self.revokeAllAccess = function(quicktexts) {
            $scope.shareData.acl.forEach(function(acl){
                if (acl.permission != 'owner') {
                    $scope.revokeAccess(quicktexts, acl.target_user_id);
                }
            });
            $rootScope.SyncNow();
        };

        self.revokeAccess = function(quicktexts, target_user_id) {
            $scope.revokeAccess(quicktexts, target_user_id);
            self.sharing_setting = 'specific';
        };

        // Save a quicktext, perform some checks before
        self.shareQt = function () {
            if ($scope.shareData.emails.length == 0 && self.sharing_setting == 'private') {
                self.revokeAllAccess($scope.selectedQuicktexts);
            } else if ($scope.shareData.emails.length == 0 && self.sharing_setting == 'everyone') {
                $scope.shareQuicktextsWithEveryone($scope.selectedQuicktexts, self.send_email);
            } else if ($scope.shareData.emails.length > 0 && $scope.shareData.acl.length - 1 >= $scope.shareData.members.length) {
                self.revokeAllAccess($scope.selectedQuicktexts);
                $scope.shareQuicktexts($scope.selectedQuicktexts, self.send_email);
            } else {
                $scope.shareQuicktexts($scope.selectedQuicktexts, self.send_email);
            }

            $scope.selectedAll = false;
            $('#quicktext-share-modal').modal('hide');
        };

        /* Check search params to see if adding or editing items */
        var checkRoute = function () {
            if ($routeParams.action && $routeParams.action == 'share') {
                $scope.shareData.emails = "";
                $scope.showShareModalListener().then(function() {
                    if ($scope.shareData.acl.length == $scope.shareData.members.length + 1) {
                        self.sharing_setting = "everyone";
                    } else if ($scope.shareData.acl.length > 1) {
                        self.sharing_setting = "specific";
                    } else {
                        self.sharing_setting = "private";
                    }
                    $('#quicktext-share-modal').modal('show');
                });
            }
        };

        $scope.$on('$routeUpdate', checkRoute);
    });
