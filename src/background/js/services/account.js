gApp.service('AccountService', function ($q, $rootScope, SettingsService) {
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
});

gApp.service('MemberService', function ($q, $rootScope) {
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
});

// TODO remove group functionality
// it's only enabled for staff
gApp.service('GroupService', function ($q, $resource, $rootScope) {
    var self = this;
    var groupResource = $resource($rootScope.apiBaseURL + 'groups/:groupId', {groupId: "@id"}, {
        update: {
            method: "PUT"
        },
        delete: {
            method: "DELETE"
        }
    });

    self.groups = function () {
        var deferred = $q.defer();
        var groups = groupResource.get(function () {
            deferred.resolve(groups);
        });
        return deferred.promise;
    };

    self.toggle = function (user) {
        var deferred = $q.defer();
        memberResource.get({memberId: user.id}, function (member) {
            member.active = !member.active;
            member.$update(function () {
                deferred.resolve();
            });
        });
        return deferred.promise;
    };

    self.update = function (data) {
        var deferred = $q.defer();

        if (data.id) {
            groupResource.get({groupId: data.id}, function (group) {
                group.name = data.name;
                group.desc = data.desc;
                group.users = data.members;
                group.$update(function () {
                    deferred.resolve();
                }, function (error) {
                    deferred.reject(error.data);
                });
            });
        } else {
            var group = new groupResource();
            group.name = data.name;
            group.desc = data.desc;
            group.users = data.members;
            group.$save(function () {
                deferred.resolve();
            }, function (error) {
                deferred.reject(error.data);
            });
        }

        return deferred.promise;
    };

    self.delete = function (data) {
        var deferred = $q.defer();
        var group = groupResource.get({groupId: data.id}, function () {
            group.$delete(function () {
                deferred.resolve();
            });
        });
        return deferred.promise;
    };
});
