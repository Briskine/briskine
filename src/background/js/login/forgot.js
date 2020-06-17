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

        const getStatus = (message = '', type = 'info') => {
            return {
                type: type,
                message: message
            };
        };
        ctrl.status = getStatus();

        ctrl.submit = function () {
            if (ctrl.loading) {
                return false;
            }

            ctrl.loading = true;
            ctrl.error = null;
            ctrl.status = getStatus();

            store.forgot(ctrl.credentials)
                .then(() => {
                    $timeout(() => {
                        ctrl.status = getStatus('Check your email for instructions on how to change your password.', 'success');
                    });
                    return;
                })
                .catch((response) => {
                    $timeout(() => {
                        if (response && response.error) {
                            ctrl.status = getStatus(response.error, 'danger');
                        } else {
                            ctrl.status = getStatus('Could not connect to password recovery server. Please try disabling your firewall or antivirus software and try again.', 'danger');
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

            <div class="alert alert-{{$ctrl.status.type}}" role="alert" ng-show="$ctrl.status.message">
                <p>{{ $ctrl.status.message }}</p>
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
