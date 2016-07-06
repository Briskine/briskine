gApp.controller('SubscriptionsCtrl', function ($scope, $rootScope, $routeParams, $q, SubscriptionService, AccountService) {
    $scope.activeTab = 'subscriptions';

    AccountService.get().then(function (account) {
        $scope.account = account;
    });

    $scope.plans = {};
    $scope.subscriptions = [];
    $scope.activeSubscription = null;
    $scope.stripeKey = "";
    $scope.preferredCurrency = "";
    $scope.quantity = 1;
    $scope.paymentError = "";
    $scope.discountCode = "";
    $scope.couponPrecentOff = 1;

    SubscriptionService.plans().then(function (data) {
        $scope.plans = data.plans;
        $scope.stripeKey = data.stripe_key;
        $scope.preferredCurrency = data.preferred_currency;
        $scope.email = data.email;


        $scope.quantity = parseInt($routeParams.quantity, 10) || 1;

        _.each($scope.plans[$scope.preferredCurrency], function (plan) {
            if (plan.sku === $routeParams.plan) {
                $scope.selectedPlan = plan;
                return false;
            }
        });
    });

    $scope.reloadSubscriptions = function () {
        SubscriptionService.subscriptions().then(function (data) {
            $scope.subscriptions = data;
            $scope.quantity = $scope.subscriptions[0].quantity;
            for (var i = 0; i <= $scope.subscriptions.length; i++) {
                if ($scope.subscriptions[i].active) {
                    $scope.activeSubscription = $scope.subscriptions[i]
                    break
                }
            }
        });
    };
    $scope.reloadSubscriptions();

    // Get a new token from stripe and send it to the server
    $scope.updateCC = function () {
        $scope.paymentMsg = '';
        $scope.paymentError = '';
        $('.update-cc-btn').addClass('disabled');

        var handler = StripeCheckout.configure({
            key: $scope.stripeKey,
            image: '/static/img/icon128.png',
            token: function (token) {
                // Use the token to create the charge with server-side.
                SubscriptionService.updateSubscription($scope.activeSubscription.id, {token: token}).then(
                    function (res) {
                        $('.update-cc-btn').removeClass('disabled');
                        $scope.paymentMsg = res
                        $scope.reloadSubscriptions();
                    }, function (res) {
                        $('.update-cc-btn').removeClass('disabled');
                        $scope.paymentError = res;
                    }
                );
            }
        });
        handler.open({
            name: 'Gorgias',
            description: 'Update your Credit Card',
            panelLabel: 'Update your Credit Card',
            email: $scope.email,
            allowRememberMe: false
        });
    };

    $scope.updateSubscription = function (plan, quantity) {
        $('.subscribe-button').addClass('disabled');
        $scope.paymentMsg = '';
        $scope.paymentError = '';

        SubscriptionService.updateSubscription($scope.activeSubscription.id, {
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

    $scope.addDiscountCode = function (discountCode) {
        var deferred = $q.defer();
        if (!discountCode) {
            alert("Please enter discount code");
            return;
        }

        // just check that the coupon exists in Stripe
        SubscriptionService.addCoupon(discountCode, function (coupon) {
            $scope.discountCode = discountCode;
            if (coupon && coupon.percent_off && coupon.valid) {
                $scope.couponPrecentOffLabel = "-" + coupon.percent_off + "%";
                $scope.couponPrecentOff = (100 - coupon.percent_off) / 100;
            }
            deferred.resolve();
        });
        return deferred.promise;
    };
});
