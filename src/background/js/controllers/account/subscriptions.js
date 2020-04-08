/* globals alert */
import _ from 'underscore';

import store from '../../../../store/store-client';

export default function SubscriptionsCtrl ($scope, $rootScope, $routeParams, $q, SubscriptionService, AccountService) {
    'ngInject';
    $scope.activeTab = 'subscriptions';

    AccountService.get().then(function (account) {
        $scope.account = account;
    });

    $scope.plans = {};
    $scope.subscriptions = [];
    $scope.activeSubscription = {
        price: 0,
        users: 1,
        plan: '',
        percent_off: 0,
        start_datetime: null,
        canceled_datetime: null
    };
    $scope.stripeKey = "";
    $scope.preferredCurrency = "";
    $scope.quantity = 1;
    $scope.paymentError = "";
    $scope.discountCode = "";
    $scope.couponPrecentOff = 1;

    $scope.bonusPlan = false;

    $scope.loadingCancel = false;

    $scope.calculatePrice = (amount = 0, quantity = 1, percentOff = 0) => {
        let total = amount * quantity;
        if (percentOff) {
            total = total * percentOff / 100;
        }

        return total / 10;
    };

    SubscriptionService.plans().then(function (data) {
        $scope.plans = data.plans;
        $scope.stripeKey = data.stripe_key;
        $scope.preferredCurrency = data.preferred_currency;
        $scope.email = data.email;

        // get quantity from url
        if ($routeParams.quantity) {
            $scope.quantity = parseInt($routeParams.quantity, 10) || 1;
        }

        _.each($scope.plans[$scope.preferredCurrency], function (plan) {
            if (plan.sku === $routeParams.plan) {
                $scope.selectedPlan = plan;
                return false;
            }
        });
    });

    $scope.reloadSubscriptions = function () {
        SubscriptionService.subscriptions().then(function (data) {
            $scope.activeSubscription = data;
            if ($scope.activeSubscription.plan === 'bonus') {
                $scope.bonusPlan = true;
            }
        });
    };
    $scope.reloadSubscriptions();

    // Get a new token from stripe and send it to the server
    $scope.updatePayment = function () {
        var ccParams = {
            stripeKey: $scope.stripeKey,
            email: $scope.email
        };
        store.updateCreditCard(ccParams).then((res) => {
            return $rootScope.updateFirebaseCreditCard(Object.assign(res, ccParams));
        });
    };

    $scope.updateSubscription = function (plan, quantity) {
        $scope.paymentMsg = '';
        $scope.paymentError = '';

        return store.updateSubscription({
                plan: plan,
                quantity: quantity
            })
            .then((res) => {
                $scope.paymentMsg = res;

                $scope.reloadSubscriptions();
            })
            .catch((err) => {
                $scope.paymentError = err;
            });
    };

    $scope.cancelSubscription = function() {
        $scope.loadingCancel = true;
        var cancelConfirm = window.confirm('Are you sure you want to cancel and delete all your template backups?');
        if (cancelConfirm === true) {
            SubscriptionService.cancelSubscription().then(function () {
                $rootScope.logOut();
            }).catch((err) => {
                $scope.loadingCancel = false;
                alert(err.msg);
            });
        } else {
            $scope.loadingCancel = false;
        }
    };
}
