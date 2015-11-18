gApp.service('AccountService', function ($q, $resource, SettingsService) {
    var self = this;

    var accResource = $resource(gApp.API_BASE_URL + 'account', {}, {
        update: {
            method: "PUT"
        },
        delete: {
            method: "DELETE"
        }
    });

    self.get = function () {
        var deferred = $q.defer();

        var user = accResource.get(function () {
            self.user = user;
            deferred.resolve(user);
        });

        return deferred.promise;
    };

    self.update = function (data) {
        var deferred = $q.defer();
        var user = new accResource();
        user.email = data.email;
        user.name = data.info.name;
        user.password = data.password;
        user.share_all = data.share_all;

        user.$update(function () {
            deferred.resolve();
        });
        return deferred.promise;
    };
});

gApp.service('MemberService', function ($q, $resource) {
    var self = this;
    var memberResource = $resource(gApp.API_BASE_URL + 'members/:memberId', {memberId: "@id"}, {
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

gApp.service('GroupService', function ($q, $resource) {
    var self = this;
    var groupResource = $resource(gApp.API_BASE_URL + 'groups/:groupId', {groupId: "@id"}, {
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

gApp.service('GroupAppsService', function ($q, $resource) {
    var self = this;
    var groupResource = $resource(gApp.API_BASE_URL + 'groups/apps');

    self.import = function (appsGroups, sendNotification) {
        var deferred = $q.defer();
        var groups = new groupResource();
        groups.apps_groups = appsGroups;
        groups.send_notification = sendNotification;
        groups.$save(function () {
            deferred.resolve(groups);
        });
        return deferred.promise;
    };

});
