gqApp.controller('LoginCtrl', function ($scope, $rootScope, QuicktextService, SettingsService, ProfileService) {
    var model = $scope.model = {};
    model.email = '';
    model.password = '';

    $scope.loginGoogle = function () {

        var loginPost = function (action) {
            var form = document.createElement("form");
            form.setAttribute("method", "post");
            form.setAttribute("action", action);
            document.body.appendChild(form);
            form.submit();
        };

        var action = SettingsService.get("baseURL") + "login/google";
        var url = "javascript:" + loginPost.toString().replace(/(\n|\t)/gm, '') + "; loginPost('" + action + "');";
        console.log(url);
        chrome.tabs.create({
            url: url,
            active: true,
        });
    };

    $scope.SubmitLogin = function () {

    };
});
