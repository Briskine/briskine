import store from '../../../../store/store-client';

export default function SubscriptionsCtrl ($scope, $rootScope, $routeParams, $q, SubscriptionService, AccountService) {
    'ngInject';
    $scope.activeTab = 'subscriptions';

    // TODO why do we need account?
    AccountService.get().then(function (account) {
        // TODO used in template
        $scope.account = account;
    });

    $scope.activeSubscription = {
        price: 0,
        users: 1,
        members: 1,
        plan: '',
        percent_off: 0,
        start_datetime: null,
        canceled_datetime: null
    };

    $scope.paymentError = '';

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

        // stripe amount is in cents
        return total / 100;
    };

    $scope.reloadSubscriptions = function () {
        return SubscriptionService.getSubscription().then(function (data) {
            $scope.activeSubscription = data;
            if ($scope.activeSubscription.plan === 'bonus') {
                $scope.bonusPlan = true;
            }
        });
    };

    $scope.reloadSubscriptions();

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
