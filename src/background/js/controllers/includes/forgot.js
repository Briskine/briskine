gApp.controller('ForgotCtrl', function ($http, $route, $rootScope) {
    var self = this;

    self.credentials = {
        email: ''
    };

    self.error = null;

    self.submit = function () {
        $http({
            method: 'POST',
            url: $rootScope.apiBaseURL + 'forgot',
            data: self.credentials
        }).then(function success() {
            $('#forgot-modal').modal('hide');
        }, function error(response) {
            if (response.data) {
                self.error = response.data.error;
            } else {
                self.error = 'Could not connect to password recovery server. Please try again.'
            }
            $('#forgot-error').alert();
        });
    };
});
