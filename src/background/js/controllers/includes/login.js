gApp.controller('LoginCtrl', function ($http, $route, $rootScope, TemplateService, SettingsService) {
    var self = this;

    self.credentials = {
        email: '',
        password: ''
    };

    self.error = null;

    self.signin = function() {
        $http({
            method: 'POST',
            url: Settings.defaults.apiBaseURL + 'signin',
            data: self.credentials
        }).then(function success(){
            $rootScope.$broadcast('loggedIn');
            $('#signin-modal').modal('hide');

            SettingsService.set('isLoggedIn', true).then(
                TemplateService.sync().then(function() {
                    $rootScope.$broadcast("templates-sync");
                })
            );
        }, function error(response){
            if (response.data) {
                self.error = response.data.error;
            } else {
                self.error = 'Could not connect to login server. Please try again.'
            }
            $('#signin-error').alert();
        });
    };

    self.forgot= function() {
        $('#signin-modal').modal('hide');
        setTimeout(function(){
            $('#forgot-modal').modal();
        }, 300)

    };
});
