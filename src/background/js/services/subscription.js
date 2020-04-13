import store from '../../../store/store-client';

export default function SubscriptionService ($q) {
    'ngInject';
    var self = this;

    self.getSubscription = function () {
        var deferred = $q.defer();
        store.getSubscription().then(deferred.resolve);
        return deferred.promise;
    };

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

