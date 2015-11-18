gApp.service('AccountService', function ($q, $resource) {
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
            deferred.resolve(user);
        });
        return deferred.promise;
    };

    self.update = function (data) {
        var deferred = $q.defer();
        var user = new accResource();
        user.email = data.email;
        user.name = data.name;
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
                group.tags = data.tags;
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
            group.tags = data.tags;
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

// User Profile - check if the user is logged in. Get it's info
gApp.service('ProfileService', function () {
    var self = this;

    self.isLoggedin = false;

    self.email = '';
    self.firstName = '';
    self.lastName = '';
    self.currentSubscription = '';
    self.expirationDate = '';

    self.gravatar = function (size) {
        return '//www.gravatar.com/avatar/' + md5.createHash(self.email);
    };

    self.reduceNumbers = function (n) {
        /* Write nice numbers. Ex: 1000 -> 1k */
        if (!n) {
            return "0";
        }
        if (n < 1000) {
            return n;
        }

        var mag, p;
        if (n < Math.pow(10, 6)) {
            mag = "k";
            p = Math.pow(10, 3);
        } else if (n < Math.pow(10, 8)) {
            p = Math.pow(10, 6);
            mag = "M";
        } else if (n < Math.pow(10, 11)) {
            p = Math.pow(10, 8);
            mag = "G";
        } else if (n < Math.pow(10, 14)) {
            p = Math.pow(10, 11);
            mag = "T";
        }
        return (Math.floor((n / p) * p) / p).toFixed(2) + mag;
    };

    //self.words = SettingsService.get("words", 0);
    //self.savedWords = self.reduceNumbers(self.words);

    self.niceTime = function (minutes) {
        if (!minutes) {
            return "0min";
        }
        if (minutes < 60) {
            return minutes + "min";
        }
        // 23h and 23m
        if (minutes < 60 * 24) {
            return Math.floor(minutes / 60) + "h and " + minutes % 60 + "min";
        } else {
            return Math.floor(minutes / (60 * 24)) + "d, " + Math.floor(minutes % (60 * 24) / 60) + "h and " + minutes % (60 * 24) % 60 + "min";
        }
    };
    // average WPM: http://en.wikipedia.org/wiki/Words_per_minute
    self.avgWPM = 33;
    self.savedTime = self.niceTime(Math.round(self.words / self.avgWPM));

    return self;
});


