import Config from '../config';
import store from '../../../store/store-client';

export default {
    bindings: {
        exportTemplates: '&'
    },
    controller: function LoginController (SettingsService, $timeout) {
        'ngInject';

        const ctrl = this;
        ctrl.websiteUrl = Config.websiteUrl;
        ctrl.step = 'login';

        ctrl.loading = false;

        ctrl.credentials = {
            email: '',
            password: ''
        };

        ctrl.error = null;

        ctrl.signin = function() {
            if (ctrl.loading) {
                return false;
            }

            ctrl.loading = true;
            ctrl.error = null;
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
                    $timeout(() => {
                        ctrl.loading = false;
                    });
                });
        };

        ctrl.setStep = function (step = 'login') {
            ctrl.step = step;
        };
    },
    template: `
        <div class="login">
            <div class="container">
                <div class="row">
                    <div class="col-lg-6 col-lg-offset-3">

                        <div class="text-center">
                            <a href="{{$ctrl.websiteUrl}}" target="_blank" class="login-logo">
                                <img src="../icons/templates-logotype.png" alt="Gorgias Templates"/>
                            </a>
                        </div>

                        <div class="login-form-container">
                            <div ng-if="$ctrl.step === 'login'">
                                <h1>
                                    Sign in
                                </h1>

                                <div class="alert alert-danger" role="alert" ng-show="$ctrl.error != null">
                                    <p>{{ $ctrl.error }}</p>
                                </div>
                                <form ng-submit="$ctrl.signin()">
                                    <div class="form-group">
                                        <label for="login-email">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            class="form-control"
                                            id="login-email"
                                            ng-model="$ctrl.credentials.email"
                                            required
                                            />
                                    </div>
                                    <div class="form-group">
                                        <button
                                            type="button"
                                            class="btn btn-link pull-right"
                                            tabindex="-1"
                                            ng-click="$ctrl.setStep('forgot')"
                                            >
                                            Forgot password?
                                        </button>

                                        <label for="login-password">
                                            Password
                                        </label>
                                        <input
                                            type="password"
                                            class="form-control"
                                            id="login-password"
                                            ng-model="$ctrl.credentials.password"
                                            required
                                            />
                                    </div>

                                    <button
                                        type="submit"
                                        ng-class="['btn btn-default btn-block', {
                                            'btn-loading': $ctrl.loading
                                        }]"
                                        >
                                        Sign In
                                    </button>
                                </form>

                                <div class="alert text-center">
                                    <strong>
                                        Don't have an account yet?
                                    </strong>
                                    <a href="{{$ctrl.websiteUrl}}/signup" target="_blank">
                                        Create a free account
                                    </a>
                                </div>

                                <div class="alert alert-info notice-export">
                                    <p>
                                        All the templates on your computer will be uploaded to your account after you sign in.
                                    </p>
                                    <p>
                                        You can
                                        <button
                                            type="button"
                                            class="btn btn-link"
                                            ng-click="$ctrl.exportTemplates()"
                                            >
                                            <strong>
                                                export your templates
                                            </strong>
                                        </button>
                                        without creating an account.
                                    </p>
                                </div>
                            </div>

                            <forgot
                                ng-if="$ctrl.step === 'forgot'"
                                back="$ctrl.setStep('login')"
                                >
                            </forgot>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
};
