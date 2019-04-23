gApp.service('SubscriptionService', function ($q, $resource, $rootScope) {
    var self = this
    var couponResource = $resource($rootScope.apiBaseURL + 'coupons')
    var planResource = $resource($rootScope.apiBaseURL + 'plans/startup')

    self.plans = function () {
        var deferred = $q.defer()
        var planData = planResource.get(function () {
            deferred.resolve(planData)
        });
        return deferred.promise;
    }

    self.subscriptions = function () {
        var deferred = $q.defer();
        store.getSubscription().then(deferred.resolve);
        return deferred.promise;
    }

    // Update active subscription
    self.updateSubscription = function (subId, params) {
        var deferred = $q.defer()
        store.getSubscription({subId: subId}).then(function (sub) {
            sub = _.extend(sub, params)
            store.updateSubscription(sub).then((res) => {
                deferred.resolve(res.msg);
            }).catch((res) => {
                deferred.reject(res.msg);
            });
        });
        return deferred.promise;
    }


    self.addCoupon = function (code, success, failure) {
        var coupon = new couponResource()
        coupon.code = code
        coupon.$save(success, failure)
    }

    self.getActiveSubscription = function () {
        var deferred = $q.defer()
        self.subscriptions().then(function (subscriptions) {
            _.each(subscriptions, function (sub) {
                if (sub.active) {
                    deferred.resolve(sub)
                }
            })
        })
        return deferred.promise
    }


    // cancel subscription
    self.cancelSubscription = function () {
        var deferred = $q.defer()
        store.cancelSubscription()
            .then(deferred.resolve)
            .catch(deferred.reject);
        return deferred.promise
    }
})

