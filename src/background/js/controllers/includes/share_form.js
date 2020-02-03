import $ from 'jquery';

import store from '../../../../store/store-client';

export default function ShareFormCtrl ($route, $q, $scope, $rootScope, $routeParams) {
        'ngInject';

        var self = this;
        self.sharing_setting = 'specific';
        self.send_email = 'false';

        self.revokeAllAccess = function(quicktexts) {
            $scope.shareData.acl.forEach(function(acl){
                if (acl.permission != 'owner') {
                    $scope.revokeAccess(quicktexts, acl.target_user_id);
                }
            });
            store.syncNow();
        };

        self.revokeAccess = function(quicktexts, target_user_id) {
            $scope.revokeAccess(quicktexts, target_user_id);
            self.sharing_setting = 'specific';
        };

        self.shareQt = function () {
            var selectedQuicktexts = $scope.getSelectedQuickTexts();
            if ($scope.shareData.emails.length == 0 && self.sharing_setting == 'private') {
                self.revokeAllAccess(selectedQuicktexts);
            } else if ($scope.shareData.emails.length == 0 && self.sharing_setting == 'everyone') {
                $scope.shareQuicktextsWithEveryone(selectedQuicktexts, self.send_email);
            } else if ($scope.shareData.emails.length > 0 && $scope.shareData.acl.length - 1 >= $scope.shareData.members.length) {
                self.revokeAllAccess(selectedQuicktexts);
                $scope.shareQuicktexts(selectedQuicktexts, self.send_email);
            } else {
                $scope.shareQuicktexts(selectedQuicktexts, self.send_email);
            }

            $('#quicktext-share-modal').modal('hide');
        };

        /* Check search params to see if adding or editing items */
        var checkRoute = function () {
            if ($routeParams.action && $routeParams.action == 'share') {
                $scope.shareData.emails = "";
                $scope.showShareModalListener().then(function() {
                    if ($scope.shareData.members.length && $scope.shareData.acl.length === $scope.shareData.members.length + 1) {
                        self.sharing_setting = "everyone";
                    } else if ($scope.shareData.acl.length > 1) {
                        self.sharing_setting = "specific";
                    } else {
                        self.sharing_setting = "private";
                    }
                    $('#quicktext-share-modal').modal('show');

                    // sharing changes on form submit,
                    // so we need another var to keep old state.
                    self.current_sharing_setting = self.sharing_setting;
                });
            }
        };

        $scope.$on('$routeUpdate', checkRoute);
    }
