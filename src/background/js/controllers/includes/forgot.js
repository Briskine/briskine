gApp.controller('ForgotCtrl', function ($http, $route, $rootScope) {
    var self = this;

    self.credentials = {
        email: ''
    };

    self.error = null;

    self.submit = function() {
        $http({
            method: 'POST',
            url: Settings.defaults.apiBaseURL + 'forgot',
            data: self.credentials
        }).then(function success(){
            $('#forgot-modal').modal('hide');
        }, function error(response){
            self.error = response.data.error;
            $('#forgot-error').alert();
        });
    };
});
