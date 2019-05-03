gApp.controller('ForgotCtrl', function ($timeout, $route, $rootScope) {
    var self = this;

    self.credentials = {
        email: ''
    };

    self.error = null;

    self.submit = function () {
        store.forgot(self.credentials)
        .then(function success() {
            $('#forgot-modal').modal('hide');
        })
        .catch(function error(response) {
            $timeout(() => {
                if (response) {
                    self.error = response.error;
                } else {
                    self.error = 'Could not connect to password recovery server. Please try again.'
                }
                $('#forgot-error').alert();
            })
        });
    };
});
