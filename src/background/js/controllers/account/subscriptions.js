import store from '../../../../store/store-client';

export default function SubscriptionsCtrl ($scope, $rootScope, $routeParams, $q, SubscriptionService, AccountService) {
    'ngInject';
    $scope.activeTab = 'subscriptions';

    // TODO why do we need account?
    AccountService.get().then(function (account) {
        // TODO used in template
        $scope.account = account;
    });

    $scope.plans = {};
    $scope.subscriptions = [];

    $scope.activeSubscription = {
        price: 0,
        users: 1,
        members: 1,
        plan: '',
        percent_off: 0,
        start_datetime: null,
        canceled_datetime: null
    };

    $scope.stripeKey = "";
    $scope.preferredCurrency = "";
//     $scope.quantity = 1;
    $scope.paymentError = "";
    $scope.discountCode = "";
    $scope.couponPrecentOff = 1;

    $scope.bonusPlan = false;

    $scope.loadingCancel = false;

    $scope.getInterval = function (plan = '') {
        if (plan.includes('yearly')) {
            return 'Year';
        }
        return 'Month';
    };

    $scope.calculatePrice = (amount = 0, quantity = 1, percentOff = 0) => {
        let total = amount * quantity;
        if (percentOff) {
            total = total - (total * percentOff / 100);
        }

        return total / 10;
    };

//     SubscriptionService.plans().then(function (data) {
//         $scope.plans = data.plans;
//         $scope.stripeKey = data.stripe_key;
//         $scope.preferredCurrency = data.preferred_currency;
//         $scope.email = data.email;
//
//         get quantity from url
//         if ($routeParams.quantity) {
//             $scope.quantity = parseInt($routeParams.quantity, 10) || 1;
//         }
//
//         _.each($scope.plans[$scope.preferredCurrency], function (plan) {
//             if (plan.sku === $routeParams.plan) {
//                 $scope.selectedPlan = plan;
//                 return false;
//             }
//         });
//     });

    $scope.reloadSubscriptions = function () {
        return SubscriptionService.subscriptions().then(function (data) {
            $scope.activeSubscription = data;
            if ($scope.activeSubscription.plan === 'bonus') {
                $scope.bonusPlan = true;
            }
        });
    };

    $scope.reloadSubscriptions();

    store.on('subscribe-success', () => {
        $scope.reloadSubscriptions();
    });

    $scope.updatePayment = function () {
        return store.updateCreditCard();
    };

    $scope.updateSubscription = function (plan, quantity) {
        $scope.paymentMsg = '';
        $scope.paymentError = '';

        return SubscriptionService.updateSubscription({
                plan: plan,
                quantity: quantity
            })
            .then((res) => {
                $scope.paymentMsg = res;

                $scope.reloadSubscriptions();
                return;
            })
            .catch((err) => {
                $scope.paymentError = err;
                return;
            });
    };

    $scope.createSubscription = function (plan, quantity) {
        return store.createSubscription({
                plan: plan,
                quantity: quantity
            });
    };

    $scope.cancelSubscription = function() {
        var cancelConfirm = window.confirm('Are you sure you want to cancel and delete all your template backups?');
        if (cancelConfirm === true) {
            return SubscriptionService.cancelSubscription()
                .then((res) => {
                    $scope.paymentMsg = res;

                    $scope.reloadSubscriptions();
                    return;
                })
                .catch((err) => {
                    $scope.paymentError = err;
                    return;
                });
        }

        const deferred = $q.defer();
        deferred.resolve();
        return deferred.promise;
    };
}
