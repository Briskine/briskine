gApp.service('SubscriptionService', function($q, $resource) {
    var self = this;
    var subResource = $resource(Settings.defaults.apiBaseURL + 'subscriptions');
    var couponResource = $resource(Settings.defaults.apiBaseURL + 'coupons');
    var planResource = $resource(Settings.defaults.apiBaseURL + 'plans');

    self.plans = function() {
        var deferred = $q.defer();
        var planData = planResource.get(function() {
            deferred.resolve(planData);
        });
        return deferred.promise;
    };

    self.subscriptions = function() {
        var deferred = $q.defer();
        var subscriptions = subResource.query(function() {
            deferred.resolve(subscriptions);
        });
        return deferred.promise;
    };

    self.addSubscription = function(sku, quantity, discountCode, token, success, failure) {
        var subscription = new subResource();
        subscription.sku = sku;
        subscription.quantity = quantity;
        subscription.token = token;
        console.log(discountCode);
        subscription.coupon = discountCode;
        subscription.$save(success, failure);
    };

    self.addCoupon = function (code, success, failure) {
        var coupon = new couponResource();
        coupon.code = code;
        coupon.$save(success, failure);
    };

    self.getActiveSubscription = function () {
        var deferred = $q.defer();
        self.subscriptions().then(function(subscriptions){
            _.each(subscriptions, function(sub){
                if (sub.active) {
                    deferred.resolve(sub);
                }
            });
        });
        return deferred.promise;
    };
});

