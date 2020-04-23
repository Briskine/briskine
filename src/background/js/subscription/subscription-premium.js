export default {
    bindings: {
        subscription: '<',
        getInterval: '&',
        calculatePrice: '&',
        createSubscription: '&'
    },
    controller: function SubscriptionPremiumController () {
        const ctrl = this;

        const basePrice = 500;
        const priceList = {
            monthly: basePrice,
            yearly: basePrice * 10
        };

        ctrl.quantity = 1;
        ctrl.plan = 'yearly';
        ctrl.$onChanges = function () {
            ctrl.quantity = ctrl.subscription.members;
        };

        ctrl.getPrice = function () {
            const price = ctrl.calculatePrice({
                amount: priceList[ctrl.plan],
                quantity: ctrl.quantity,
                percentOff: ctrl.subscription.percent_off
            });

            return `$${price}/${ctrl.getInterval({plan: ctrl.plan})}`;
        };

        ctrl.create = function () {
            return ctrl.createSubscription({
                    plan: ctrl.plan,
                    quantity: ctrl.quantity
                });
        };
    },
    template: `
        <div class="subscription-premium alert alert-info">
            <h2>
                Upgrade to Premium
            </h2>

            <div class="row">
                <div class="col-sm-6">
                    <p>
                        Work together with your team on the Premium plan.
                    </p>
                    <ul>
                        <li>
                            Get unlimited templates.
                        </li>
                        <li>
                            Unlimited people on your team.
                        </li>
                        <li>
                            Collaborate on shared templates with your entire team.
                        </li>
                        <li>
                            Share certain templates with only a few teammates.
                        </li>
                    </ul>
                </div>
                <div class="col-sm-6" ng-submit="$ctrl.create()">
                    <form class="form-horizontal">
                        <div class="form-group">
                            <label for="quantity" class="col-xs-6 control-label text-right">
                                Team members:
                            </label>
                            <div class="col-xs-6">
                                <input type="number" id="quantity" min="{{$ctrl.subscription.members}}" ng-model="$ctrl.quantity" class="form-control">
                            </div>
                        </div>

                        <div class="form-group row">
                            <fieldset>
                                <label class="col-xs-6 control-label text-right">
                                    Billing:
                                </label>
                                <div class="col-xs-6">
                                    <div class="switch-toggle switch-default">
                                        <input id="monthly" name="billing" type="radio" value="monthly" ng-model="$ctrl.plan">
                                        <label for="monthly">
                                            Monthly
                                        </label>

                                        <input id="yearly" name="billing" type="radio" value="yearly" ng-model="$ctrl.plan">
                                        <label for="yearly">
                                            Yearly
                                        </label>

                                        <a></a>
                                    </div>
                                </div>
                            </fieldset>
                        </div>

                        <div class="text-right">
                            <button
                                class="btn btn-default btn-lg"
                                type="submit"
                                ng-class="{
                                    'btn-loading': $ctrl.loading
                                }"
                            >
                                Subscribe to Premium
                                <strong>
                                    {{$ctrl.getPrice()}}
                                </strong>
                            </button>

                            <div class="text text-muted">
                                <strong>
                                    Save 20%
                                </strong>
                                by paying Yearly!
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `
};
