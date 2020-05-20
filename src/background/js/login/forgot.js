import store from '../../../store/store-client';

export default {
    bindings: {
        back: '&'
    },
    controller: function ForgotController ($timeout) {
        'ngInject';

        const ctrl = this;
        ctrl.loading = false;

        ctrl.credentials = {
            email: ''
        };

        ctrl.error = null;

        ctrl.submit = function () {
            if (ctrl.loading) {
                return false;
            }

            ctrl.loading = true;

            store.forgot(ctrl.credentials)
                .then(function success() {
                    ctrl.error = null;
                    return;
                })
                .catch(function error(response) {
                    $timeout(() => {
                        if (response && response.error) {
                            ctrl.error = response.error;
                        } else {
                            ctrl.error = 'Could not connect to password recovery server. Please try disabling your firewall or antivirus software and try again.';
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
        <div>
            <button type="button" class="btn btn-link" ng-click="$ctrl.back()">
                <i class="fa fa-arrow-left"></i>
                Back to Sign In
            </button>

            <h2>
                Reset Password
            </h2>

            <p class="help-block">
                We'll send you instructions for changing your password.
            </p>

            <div id="error" class="alert alert-danger" role="alert" ng-show="$ctrl.error != null">
                <p>{{ $ctrl.error }}</p>
            </div>
            <form ng-submit="$ctrl.submit()">
                <div class="form-group">
                    <label for="email">
                        Your email
                    </label>
                    <input
                        type="email"
                        class="form-control"
                        id="email"
                        ng-model="$ctrl.credentials.email"
                        required
                        />
                </div>

                <button
                    type="submit"
                    class="btn btn-default btn-block"
                    ng-class="{
                        'btn-loading': $ctrl.loading
                    }"
                    >
                    Email me a password reset link
                </button>
            </form>
        </div>
    `
};
