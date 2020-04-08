function capitalize (str = '') {
    return str.charAt(0).toUpperCase() + str.slice(1);
}


function getPeriod (plan = '') {
    if (plan.includes('yearly')) {
        return 'Year';
    }
    return 'Month';
}

export default {
    bindings: {
        subscription: '<',
        calculatePrice: '&'
    },
    controller: function SubscriptionActiveController () {
        const ctrl = this;

        ctrl.isPremium = function (plan = '') {
            return ['monthly', 'yearly'].includes(plan);
        };

        ctrl.displayName = function () {
            if (ctrl.isPremium(ctrl.subscription.plan)) {
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
                quantity: ctrl.subscription.quantity,
                percentOff: ctrl.subscription.percent_off
            });

            return `$${price}/${getPeriod(plan)}`;
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
                                    {{$ctrl.subscription.start_datetime | date:'dd MMMM yyyy' }}
                                </strong>
                            </li>
                            <li ng-show="$ctrl.subscription.percent_off">
                                You have a
                                <strong>
                                    {{$ctrl.subscription.percent_off}}%
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
                            Current price:
                            <strong>
                                {{$ctrl.getPrice()}}
                            </strong>
                        </div>
                        <div ng-show="$ctrl">
                            <button type="button" class="btn btn-primary">
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
