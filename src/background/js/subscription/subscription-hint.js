export default {
    bindings: {
        freeLimit: '<',
        showAuthWarning: '&',
        reachedFreeLimit: '&'
    },
    controller: function SubscriptionHint () {
        const ctrl = this;

        ctrl.showHint = function () {
            return ctrl.reachedFreeLimit() || ctrl.showAuthWarning();
        };
    },
    template: `
        <div
            class="alert alert-warning"
            ng-if="$ctrl.showHint()"
        >
            <div ng-if="$ctrl.authWarning()">
                <p>
                    Please
                    <a href="#">log in</a>
                    or
                    <a href="#">create a free account</a>
                    to avoid losing your templates.
                </p>

                <p>
                    Your templates are only saved on your computer now. If you re-install Chrome you will lose your templates.
                </p>
            </div>

            <div ng-if="$ctrl.reachedFreeLimit()">
                <p>
                    You've reached the
                    <strong>
                        {{$ctrl.freeLimit}}
                    </strong>
                    template limit of the
                    <strong>
                        Free
                    </strong>
                    plan.
                </p>
                <p>
                    <a href="#/account/subscriptions">Upgrade to the Premium plan</a>
                    to get unlimited templates and team collaboration features.
                </p>
            </div>


            <p ng-if="$ctrl.upgrade">
                Your team has temporarily lost access to their templates.
                <a href="#/account/subscriptions">
                    Reactivate your Premium subscription
                </a>
                to restore access for your team.
            </p>
        </div>
    `
};
