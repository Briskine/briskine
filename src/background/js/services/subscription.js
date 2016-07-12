gApp.service('SubscriptionService', function ($q, $resource) {
    var self = this;
    var subResource = $resource(Settings.defaults.apiBaseURL + 'subscriptions/:subId',
        {subId: "@id"},
        {update: {method: 'PUT', isArray: false}}
    );
    var couponResource = $resource(Settings.defaults.apiBaseURL + 'coupons');
    var planResource = $resource(Settings.defaults.apiBaseURL + 'plans/startup');

    self.plans = function () {
        var deferred = $q.defer();
        var planData = planResource.get(function () {
            deferred.resolve(planData);
        });
        return deferred.promise;
    };

    self.subscriptions = function () {
        var deferred = $q.defer();
        var subscriptions = subResource.query(function () {
            deferred.resolve(subscriptions);
        });
        return deferred.promise;
    };

    // Update active subscription
    self.updateSubscription = function (subId, params) {
        var deferred = $q.defer();

        subResource.get({subId: subId}, function (sub) {
            sub = _.extend(sub, params)
            sub.$update(function (res) {
                deferred.resolve(res.msg);
            }, function (res) {
                deferred.reject(res.data.msg);
            });
        })
        return deferred.promise;
    };


    self.addCoupon = function (code, success, failure) {
        var coupon = new couponResource();
        coupon.code = code;
        coupon.$save(success, failure);
    };

    self.getActiveSubscription = function () {
        var deferred = $q.defer();
        self.subscriptions().then(function (subscriptions) {
            _.each(subscriptions, function (sub) {
                if (sub.active) {
                    deferred.resolve(sub);
                }
            });
        });
        return deferred.promise;
    };
});

