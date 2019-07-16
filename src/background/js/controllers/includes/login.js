gApp.controller('LoginCtrl', function ($timeout, $route, $rootScope, TemplateService, SettingsService) {
    var self = this;
    self.loading = false;

    self.credentials = {
        email: '',
        password: ''
    };

    self.error = null;

    self.signin = function() {
        self.loading = true;

        store.signin(self.credentials)
            .then(function success(){
                SettingsService.set('isLoggedIn', true).then(window.location.reload(true));
                return;
            })
            .catch(function error(response) {
                $timeout(() => {
                    if (response) {
                        self.error = response.error;
                    } else {
                        self.error = 'Could not connect to login server. Please try again.'
                    }
                    $('#signin-error').alert();
                });
                return;
            })
            .then(() => {
                self.loading = false;
            });
    };

    self.forgot= function() {
        $('#signin-modal').modal('hide');
        setTimeout(function(){
            $('#forgot-modal').modal();
        }, 300)

    };
});
