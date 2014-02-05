gqApp.controller('LoginCtrl', function ($scope, $rootScope, QuicktextService, SettingsService, ProfileService) {
    var model = $scope.model = {};
    model.email = '';
    model.password = '';

    $scope.loginGoogle = function () {
        chrome.tabs.create({
            url: SettingsService.get("baseURL") + "/login/google",
            active: true,
        });
    };

    $scope.SubmitLogin = function () {

    };
});
