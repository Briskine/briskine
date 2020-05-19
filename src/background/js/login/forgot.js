import store from '../../../store/store-client';

export default {
    bindings: {
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
            <div id="error" class="alert alert-danger" role="alert" ng-show="$ctrl.error != null">
                <p><b>{{ $ctrl.error }}</b></p>
            </div>
            <form novalidate ng-submit="$ctrl.submit()">
                <div class="form-group">
                    <label for="email">Email</label>
                    <input type="email" class="form-control" id="email" placeholder="Your email"
                    required="required" ng-model="$ctrl.credentials.email"/>
                    </div>
                    <p class="help-block">You'll receive an e-mail with the recovery instructions.</p>
                    <div class="text-right">
                    <button type="submit" class="btn btn-default" ng-class="{
                        'btn-loading': $ctrl.loading
                    }">
                        Recover your password
                    </button>
                </div>
            </form>
        </div>
    `
};
