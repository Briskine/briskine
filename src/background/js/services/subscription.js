import _ from 'underscore';

import store from '../../../store/store-client';

export default function SubscriptionService ($q) {
    'ngInject';
    var self = this;

    // TODO deprecate
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
    // TODO deprecate end


    self.cancelSubscription = function () {
        var deferred = $q.defer();
        store.cancelSubscription()
            .then(deferred.resolve)
            .catch(deferred.reject);
        return deferred.promise;
    };

    self.updateSubscription = function (params = {}) {
        var deferred = $q.defer();
        store.updateSubscription(params)
            .then(deferred.resolve)
            .catch(deferred.reject);
        return deferred.promise;
    };
}

