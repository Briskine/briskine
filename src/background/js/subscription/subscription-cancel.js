export default {
    bindings: {
        subscription: '<',
        cancelSubscription: '&'
    },
    controller: function SubscriptionCancelController () {
        const ctrl = this;

        ctrl.cancel = function () {
            ctrl.loading = true;
            return ctrl.cancelSubscription()
                .then(() => {
                    ctrl.loading = false;
                });
        };
    },
    template: `
        <div class="alert border border-danger border-rounded">
            <h4>Danger zone</h4>

            <p>
                If you are not satisfied with Gorgias Templates you can cancel your subscription below.
            </p>
            <p>
                <strong>
                    Warning:
                </strong>
                If you cancel we will <strong>permanently delete</strong> all backups of your templates and those of your team members from our servers.
            </p>
            <p>
                We encourage you to backup your templates before you cancel by exporting them <a href="#/list">here</a>.
            </p>
            <p>
                <button class="btn btn-default" ng-class="{
                    'btn-loading': $ctrl.loading
                }" ng-click="$ctrl.cancel()">
                    I understand. Cancel subscription.
                </button>
            </p>
        </div>
    `
};
