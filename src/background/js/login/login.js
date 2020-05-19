import store from '../../../store/store-client';

export default {
    bindings: {
    },
    controller: function LoginController (SettingsService, $timeout) {
        'ngInject';

        const ctrl = this;

        ctrl.loading = false;

        ctrl.credentials = {
            email: '',
            password: ''
        };

        ctrl.error = null;

        ctrl.signin = function() {
            ctrl.loading = true;

            store.signin(ctrl.credentials)
                .then(function success(){
                    SettingsService.set('isLoggedIn', true).then(window.location.reload(true));
                    return;
                })
                .catch(function error(response) {
                    $timeout(() => {
                        if (response && response.error) {
                            ctrl.error = response.error;
                        } else {
                            ctrl.error = 'Could not connect to login server. Please try disabling your firewall or antivirus software and try again.';
                        }
                    });
                    return;
                })
                .then(() => {
                    ctrl.loading = false;
                });
        };
    },
    template: `
        <div class="login">
            <div class="row">
                <div class="col-xs-12">

                        <div id="signin-error" class="alert alert-danger" role="alert" ng-show="$ctrl.error != null">
                            <p><b>{{ $ctrl.error }}</b></p>
                        </div>
                        <form novalidate ng-submit="$ctrl.signin()">
                            <div class="form-group">
                                <label for="signin-email">Email</label>
                                <input type="email" class="form-control" id="signin-email" placeholder="Your email"
                                       ng-model="$ctrl.credentials.email"/>
                            </div>
                            <div class="form-group">
                                <label for="signin-pwd">Password</label>
                                <input type="password" class="form-control" id="signin-pwd" placeholder="Your password"
                                       ng-model="$ctrl.credentials.password"/>
                            </div>
                            <div class="text-right">
                                <a class="recover-password" href>Forgot password?</a>
                                <button type="submit" ng-class="['btn btn-default', {'btn-loading': $ctrl.loading}]">
                                    Login
                                </button>
                            </div>
                        </form>

                        <forgot></forgot>
                </div>
            </div>
        </div>
    `
};
