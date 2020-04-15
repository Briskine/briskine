export default {
    bindings: {
        subscription: '<',
        upgrade: '<'
    },
    template: `
        <div
            class="alert alert-warning"
        >
            <button type="button" class="close" data-dismiss="alert" aria-hidden="true">×</button>

            <p>
                Your
                <strong>
                    Premium
                </strong>
                subscription was canceled on
                <strong>
                    {{$ctrl.subscription.canceled_datetime | date: 'dd MMMM yyyy' }}.
                </strong>
            </p>

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
