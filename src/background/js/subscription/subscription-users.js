
export default {
    bindings: {
        subscription: '<',
        getInterval: '&',
        calculatePrice: '&',
        updateSubscription: '&'
    },
    controller: function SubscriptionUsersController () {
        const ctrl = this;

        ctrl.users = 1;
        ctrl.$onChanges = function () {
            ctrl.users = ctrl.subscription.users;
        };

        ctrl.loading = false;

        ctrl.getPrice = function (users = 1) {
            const price = ctrl.calculatePrice({
                amount: ctrl.subscription.price,
                quantity: users,
                percentOff: ctrl.subscription.percent_off
            });

            return `$${price}/${ctrl.getInterval({plan: ctrl.subscription.plan})}`;
        };

        ctrl.updateSubscriptionUsers = function (users = 1) {
            ctrl.loading = true;
            return ctrl.updateSubscription({
                    quantity: users
                })
                .then(() => {
                    ctrl.loading = false;
                });
        };
    },
    template: `
        <div class="panel panel-default">
            <div class="panel-heading">
                Total Users
            </div>
            <div class="panel-body">
                <div class="row">
                    <div class="col-md-8">
                        <ul>
                            <li>
                                You currently have
                                <strong>
                                    {{$ctrl.subscription.users}}
                                </strong>
                                user seat{{$ctrl.subscription.users > 1 ? 's' : ''}} on your team.
                            </li>
                            <li>
                                Add or remove user seats from your team using the form here.
                            </li>
                            <li>
                                You'll get billed only for what you use.
                                <div class="text-muted">
                                    Example:
                                    If you begin with 2 users (10$/month) on May 1st then add a 3rd user on May 15, on May 31 you'll get billed 12.5$.
                                </div>
                            </li>
                        </ul>
                    </div>
                    <form class="col-md-4 form-inline" ng-submit="$ctrl.updateSubscriptionUsers($ctrl.users)">
                        <div class="form-group">
                            <label for="users">
                                Total users:
                            </label>
                            <input type="number" min="{{$ctrl.subscription.members}}" class="form-control" id="users" ng-model="$ctrl.users">
                        </div>
                        <div>
                            <button
                                type="submit"
                                class="btn btn-primary"
                                ng-class="{
                                    'btn-loading': $ctrl.loading
                                }"
                            >
                                Update Total Users
                                <strong>
                                    {{$ctrl.getPrice($ctrl.users)}}
                                </strong>
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `
};
