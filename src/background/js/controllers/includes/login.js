gApp.controller('LoginCtrl', function ($http, $route, $rootScope) {
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
        }).then(function success(response){
            $rootScope.$broadcast('loggedIn');
            $('#signin-modal').modal('hide');
        }, function error(response){
            self.error = response.data.error;
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
