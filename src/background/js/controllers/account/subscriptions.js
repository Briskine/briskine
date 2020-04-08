/* globals StripeCheckout, alert */
import $ from 'jquery';
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
            if (
                $scope.activeSubscription.plan === 'bonus'
            ) {
                $scope.bonusPlan = true;
            }

            // TODO check objects if used
//             $scope.subscriptions = data;
//             TODO check where used
//             $scope.quantity = $scope.subscriptions[0].quantity;
//             for (var i = 0; i <= $scope.subscriptions.length; i++) {
//                 if ($scope.subscriptions[i].active) {
//                     $scope.activeSubscription = $scope.subscriptions[i];
//                     if (
//                         $scope.activeSubscription.plan &&
//                         $scope.activeSubscription.plan.name === 'bonus'
//                     ) {
//                         $scope.bonusPlan = true;
//                     }
//                     break;
//                 }
//             }
        });
    };
    $scope.reloadSubscriptions();

    function updateLegacyCreditCard (params = {}) {
        return new Promise((resolve) => {
            var handler = StripeCheckout.configure({
                key: params.stripeKey,
                token: function (token) {
                    resolve(token);
                }
            });
            handler.open({
                name: 'Gorgias',
                description: 'Update your Credit Card',
                panelLabel: 'Update your Credit Card',
                email: params.email,
                allowRememberMe: false
            });
        });
    }

    // Get a new token from stripe and send it to the server
    $scope.updateCC = function () {
        $scope.paymentMsg = '';
        $scope.paymentError = '';
        $('.update-cc-btn').addClass('disabled');

        // BUG on old-api, must wait for plans to load
        var ccParams = {
            stripeKey: $scope.stripeKey,
            email: $scope.email
        };
        store.updateCreditCard(ccParams).then((res) => {
            if (res.firebase) {
                return $rootScope.updateFirebaseCreditCard(Object.assign(res, ccParams));
            }

            return updateLegacyCreditCard(ccParams).then((token) => {
                // Use the token to create the charge with server-side.
                SubscriptionService.updateSubscription($scope.activeSubscription.id, {token: token}).then(
                    function (res) {
                        $('.update-cc-btn').removeClass('disabled');
                        $scope.paymentMsg = res;
                        $scope.reloadSubscriptions();
                    }, function (res) {
                        $('.update-cc-btn').removeClass('disabled');
                        $scope.paymentError = res;
                    }
                );
            });
        });
    };

    $scope.updateSubscription = function (plan, quantity) {
        $('.subscribe-button').addClass('disabled');
        $scope.paymentMsg = '';
        $scope.paymentError = '';

        // backwards-compatibility
        // we don't have subscription ids in firestore
        var subId = $scope.activeSubscription.id || Date.now();
        SubscriptionService.updateSubscription(subId, {
            plan: plan,
            quantity: quantity
        }).then(function (res) {
            $scope.paymentMsg = res;
            $('.subscribe-button').removeClass('disabled');
        }, function (res) {
            $scope.paymentError = res;
            $('.subscribe-button').removeClass('disabled');
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
