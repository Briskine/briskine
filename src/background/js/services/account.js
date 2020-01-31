import store from '../../../store/store-client';

export function AccountService ($q, SettingsService) {
    'ngInject';
    var self = this;

    self.get = function () {
        var deferred = $q.defer();

        SettingsService.get('isLoggedIn').then(function (isLoggedIn) {
            if (!isLoggedIn) {
                return deferred.reject();
            }

            store.getAccount().then((user) => {
                self.user = user;
                deferred.resolve(user);
            });
        });

        return deferred.promise;
    };

    self.update = function (data) {
        var deferred = $q.defer();
        store.setAccount({
            email: data.email,
            name: data.info.name,
            password: data.password,
            share_all: data.info.share_all
        }).then(() => {
            deferred.resolve();
        });
        return deferred.promise;
    };
}

export function MemberService ($q) {
    'ngInject';
    var self = this;

    self.members = function () {
        var deferred = $q.defer();
        store.getMembers().then(deferred.resolve);
        return deferred.promise;
    };

    self.toggle = function (user) {
        var deferred = $q.defer();
        store.setMember({
            id: user.id,
            active: !user.active,
            email: user.email,
            is_customer: user.is_customer,
            name: user.name,
            user_id: user.user_id
        }).then(deferred.resolve);
        return deferred.promise;
    };

    self.update = function (data) {
        var deferred = $q.defer();
        var member = {
            id: data.id,
            name: data.name,
            email: data.email,
            send_notification: data.sendNotification
        };

        store.setMember(member)
            .then(deferred.resolve)
            .catch(deferred.reject);

        return deferred.promise;
    };
}
