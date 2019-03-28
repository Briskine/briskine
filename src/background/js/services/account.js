gApp.service('AccountService', function ($q, $resource, $rootScope) {
    var self = this;

    self.get = function () {
        var deferred = $q.defer();

        store.getAccount().then((user) => {
            self.user = user;
            deferred.resolve(user);
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

gApp.service('MemberService', function ($q, $resource, $rootScope) {
    var self = this;
    var memberResource = $resource($rootScope.apiBaseURL + 'members/:memberId', {memberId: "@id"}, {
        update: {
            method: "PUT"
        },
        delete: {
            method: "DELETE"
        }
    });

    self.members = function () {
        var deferred = $q.defer();
        var members = memberResource.get(function () {
            deferred.resolve(members);
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
            memberResource.get({memberId: data.id}, function (member) {
                member.name = data.name;
                member.email = data.email;
                member.send_notification = data.sendNotification;
                member.$update(function () {
                    deferred.resolve();
                }, function (error) {
                    deferred.reject(error.data);
                });
            });
        } else {
            var member = new memberResource();
            member.name = data.name;
            member.email = data.email;
            member.send_notification = data.sendNotification;
            member.$save(function () {
                deferred.resolve();
            }, function (error) {
                deferred.reject(error.data);
            });
        }

        return deferred.promise;
    };

    self.delete = function (data) {
        var deferred = $q.defer();
        var member = memberResource.get({memberId: data.id}, function () {
            member.$delete(function () {
                deferred.resolve();
            });
        });
        return deferred.promise;
    };
});

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
