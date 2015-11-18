gApp.controller('SubscriptionsCtrl', function($scope, $rootScope, $routeParams, $q, SubscriptionService) {
    $scope.activeTab = 'subscriptions';

    $scope.plans = {};
    $scope.subscriptions = [];
    $scope.stripeKey = "";
    $scope.preferredCurrency = "";
    $scope.quantity = 1;
    $scope.paymentError = "";
    $scope.discountCode= "";
    $scope.couponPrecentOff = 1;


    SubscriptionService.plans().then(function(data) {
        $scope.plans = data.plans;
        $scope.stripeKey = data.stripe_key;
        $scope.preferredCurrency = data.preferred_currency;
        $scope.email = data.email;


        $scope.quantity = parseInt($routeParams.quantity, 10) || 1;

        _.each($scope.plans[$scope.preferredCurrency], function(plan){
            if (plan.sku === $routeParams.plan) {
                $scope.selectedPlan = plan;
                return false;
            }
        });

        // to subscribe from the link use this as an example: http://localhost:5000/app#/subscriptions?action=upgrade&plan=yearly-usd-1&quantity=20&coupon=KINNEK-12
        var subscribe = function() {
            if (typeof StripeCheckout !== 'undefined') {
                 if (typeof $routeParams.coupon !== 'undefined') {
                    $scope.addDiscountCode($routeParams.coupon).then(function(){
                        $scope.subscribe();
                    });
                 } else {
                     $scope.subscribe();
                 }
            } else {
                // if we don't have stripe loaded yet, then wait and try again
                setTimeout(subscribe, 500);
            }
        };
        if ($scope.selectedPlan) {
            subscribe();
        }
    });

    $scope.reloadSubscriptions = function() {
        SubscriptionService.subscriptions().then(function(data) {
            $scope.subscriptions = data;
        });
    };

    $scope.reloadSubscriptions();

    $scope.subscribe = function(quantity) {
        $scope.selectedPlan = this.plan || $scope.selectedPlan;
        $scope.quantity = quantity || $scope.quantity;

        var handler = StripeCheckout.configure({
            key: $scope.stripeKey,
            image: '/static/img/icon128.png',
            token: function(token) {
                // Use the token to create the charge with server-side.
                SubscriptionService.addSubscription($scope.selectedPlan.sku, $scope.quantity, $scope.discountCode, token, function() {
                    // success
                    $scope.paymentError = "";
                    $scope.reloadSubscriptions();
                }, function(res) {
                    // failure with an error (if any)
                    $scope.paymentError = res.data;
                });
            }
        });

        handler.open({
            name: 'Gorgias',
            description: $scope.quantity + " x " + $scope.selectedPlan.name + ' Subscription',
            amount: parseInt($scope.selectedPlan.amount * 100 * $scope.quantity * $scope.couponPrecentOff, 10),
            email: $scope.email,
            currency: $scope.selectedPlan.currency,
            opened: function(){
                $(".subscribe-button").button('loading');
            },
            closed: function(){
                $(".subscribe-button").button('reset');
            }
        });
    };

    $scope.showDeleteAccountModal = function() {
        mixpanel.track("Opened delete account modal");
        $("#delete-account-modal").modal();
    };


    $scope.addDiscountCode = function (discountCode) {
        var deferred = $q.defer();
        if (!discountCode){
            alert("Please enter discount code");
            return;
        }

        // just check that the coupon exists in Stripe
        SubscriptionService.addCoupon(discountCode, function(coupon){
            $scope.discountCode = discountCode;
            if (coupon && coupon.percent_off && coupon.valid ) {
                $scope.couponPrecentOffLabel = "-" +  coupon.percent_off + "%";
                $scope.couponPrecentOff = (100 - coupon.percent_off) / 100;
            }
            deferred.resolve();
        });
        return deferred.promise;
    };
});
