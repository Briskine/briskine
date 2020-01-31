import store from '../../../store/store-client';

export default function SubscriptionService ($q) {
    'ngInject';
    var self = this;

    self.plans = function () {
        var deferred = $q.defer();
        store.getPlans().then(deferred.resolve);
        return deferred.promise;
    };

    self.subscriptions = function () {
        var deferred = $q.defer();
        store.getSubscription().then(deferred.resolve);
        return deferred.promise;
    };

    // Update active subscription
    self.updateSubscription = function (subId, params) {
        var deferred = $q.defer();
        store.getSubscription({subId: subId}).then(function (sub) {
            var updateParams = Object.assign({}, sub, params);
            store.updateSubscription(updateParams).then((res) => {
                deferred.resolve(res.msg);
            }).catch((res) => {
                deferred.reject(res.msg);
            });
        });
        return deferred.promise;
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


    // cancel subscription
    self.cancelSubscription = function () {
        var deferred = $q.defer();
        store.cancelSubscription()
            .then(deferred.resolve)
            .catch(deferred.reject);
        return deferred.promise;
    };
}

