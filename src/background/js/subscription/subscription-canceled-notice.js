export default {
    bindings: {
        subscription: '<'
    },
    controller: function SubscriptionCanceledNoticeController () {
        const ctrl = this;
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
        </div>
    `
};
