gApp.controller('LoginCtrl', function ($timeout, $route, $rootScope, TemplateService, SettingsService) {
    var self = this;

    self.credentials = {
        email: '',
        password: ''
    };

    self.error = null;

    self.signin = function() {
        store.signin(self.credentials)
            .then(function success(){
                SettingsService.set('isLoggedIn', true).then(window.location.reload(true));
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
            });
    };

    self.forgot= function() {
        $('#signin-modal').modal('hide');
        setTimeout(function(){
            $('#forgot-modal').modal();
        }, 300)

    };
});
