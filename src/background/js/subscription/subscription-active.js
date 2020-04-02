export default {
    bindings: {
        subscription: '<'
    },
    controller: function SubscriptionActiveController () {
        const ctrl = this;
        // only runs on init but refs are updated
    },
    template: `
        <div class="panel panel-info">
            <div class="panel-heading">
                Active Subscription
                {{$ctrl.test}}
            </div>
            <div class="panel-body">
                <div class="row">
                    <div class="col-md-8">
                        <ul>
                            <li>
                                Your
                                <strong>
                                    {{$ctrl.subscription.plan}}
                                    Premium Monthly
                                </strong>
                                subscription started on
                                <strong>
                                    11 March 2020
                                </strong>
                            </li>
                            <li>
                                You have a
                                <strong>
                                    20%
                                </strong>
                                discount.
                            </li>
                            <li>
                                <a href="#">
                                    Update your Credit Card
                                </a>
                            </li>
                        </ul>
                    </div>
                    <div class="col-md-4">
                        <div>
                            Current price: <strong>$12.00</strong>
                        </div>
                        <div>
                            <button type="button">
                                Switch to Yearly -
                                <strong>
                                    $14.00
                                </strong>
                            </button>
                            <span class="text-muted">
                                and save 20%
                            </span>
                    </div>
                </div>
            </div>
        </div>
    `
};
