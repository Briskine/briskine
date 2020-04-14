function capitalize (str = '') {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export default {
    bindings: {
        subscription: '<',
        getInterval: '&',
        calculatePrice: '&',
        updatePayment: '&',
        updateSubscription: '&',
        isPremium: '&',
        isOwner: '&'
    },
    controller: function SubscriptionActiveController () {
        const ctrl = this;

        ctrl.loading = false;

        ctrl.displayName = function () {
            if (ctrl.isPremium()) {
                return `Premium ${capitalize(ctrl.subscription.plan)}`;
            }

            return capitalize(ctrl.subscription.plan);
        };

        ctrl.getAlternate = function (plan = '', cap = false) {
            let alternate = 'yearly';
            if (plan === 'yearly') {
                alternate = 'monthly';
            }

            return cap ? capitalize(alternate) : alternate;
        };

        ctrl.getPrice = function (plan = 'monthly') {
            let amount = ctrl.subscription.price;
            if (plan !== ctrl.subscription.plan) {
                // calculate alternate pricing
                if (plan === 'monthly') {
                    // current is yearly
                    amount = amount / 10;
                } else if (plan === 'yearly') {
                    // current is monthly
                    amount = amount * 10;
                }
            }

            const price = ctrl.calculatePrice({
                amount: amount,
                quantity: ctrl.subscription.users,
                percentOff: ctrl.subscription.percent_off
            });

            return `$${price}/${ctrl.getInterval({plan: plan})}`;
        };

        ctrl.switchSubscription = function () {
            ctrl.loading = true;
            return ctrl.updateSubscription({
                    plan: ctrl.getAlternate(ctrl.subscription.plan)
                })
                .then(() => {
                    ctrl.loading = false;
                });
        };
    },
    template: `
        <div class="panel panel-info">
            <div class="panel-heading">
                Your Subscription
            </div>
            <div class="panel-body">
                <div class="row">
                    <div class="col-md-8">
                        <ul>
                            <li>
                                Your
                                <strong>
                                    {{$ctrl.displayName()}}
                                </strong>
                                subscription started on
                                <strong>
                                    {{$ctrl.subscription.start_datetime | date:'dd MMMM yyyy' }}.
                                </strong>
                            </li>
                            <li ng-show="$ctrl.subscription.percent_off">
                                You have a
                                <strong>
                                    {{$ctrl.subscription.percent_off}}%
                                </strong>
                                discount.
                            </li>
                            <li ng-show="$ctrl.isPremium() && $ctrl.isOwner()">
                                If your card expired, or you want to switch to another card:
                                <button type="button" class="btn btn-link" ng-click="$ctrl.updatePayment()">
                                    Update your Credit Card
                                </button>
                            </li>
                            <li>
                                Only the account owner can upgrade, downgrade or change the billing information for the account.
                            </li>
                            <li>
                                Contact
                                <a href="mailto:chrome@gorgias.com">
                                    chrome@gorgias.com
                                </a>
                                for any details about your subscription.
                            </li>
                        </ul>
                    </div>
                    <div class="col-md-4 text-right" ng-if="$ctrl.isOwner()">
                        <p class="form-group">
                            Current price:
                            <strong>
                                {{$ctrl.getPrice($ctrl.subscription.plan)}}
                            </strong>
                        </p>
                        <div ng-show="$ctrl.isPremium()">
                            <button
                                type="button"
                                class="btn btn-primary"
                                ng-click="$ctrl.switchSubscription()"
                                ng-class="{
                                    'btn-loading': $ctrl.loading
                                }"
                            >
                                Switch to {{$ctrl.getAlternate($ctrl.subscription.plan, true)}}
                                <strong>
                                    {{$ctrl.getPrice($ctrl.getAlternate($ctrl.subscription.plan))}}
                                </strong>
                            </button>
                            <div class="text-muted" ng-show="$ctrl.subscription.plan === 'monthly'">
                                and save 20%
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `
};
