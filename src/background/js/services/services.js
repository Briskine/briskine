/*jshint multistr: true */

// Handle stats (publish stats on the remote server)
gApp.service('StatsService', function ($resource, SettingsService) {
    var self = this;

    self.syncStatsTimer = null;
    SettingsService.get('apiBaseURL').then(function (apiBaseURL) {
        self.statsRes = $resource(apiBaseURL + 'stats/');
    });

    // should probably be called every few minutes or so
    self.sync = function () {
        SettingsService.get("sendStatsEnabled").then(function (sendStatsEnabled) {
            if (sendStatsEnabled) { // do this only if user allowed sending anonymous statistics
                SettingsService.get("words").then(function (words) {
                    SettingsService.get('syncedWords').then(function (syncedWords) {
                        var newWords = words - syncedWords;
                        if (newWords > 0) {
                            var stats = new self.statsRes();
                            stats.words = newWords;
                            stats.$save(function () {
                                SettingsService.set("syncedWords", words);
                                SettingsService.set("lastStatsSync", new Date());
                            });
                        }
                    });
                });
            }
        });

        window.clearTimeout(self.syncStatsTimer);
        self.syncStatsTimer = window.setTimeout(self.sync, 15 * 60 * 1000); // every 15minutes
    };
    self.sync();
});

// Handle stats (publish stats on the remote server)
gApp.service('SuggestionService', function ($q, $resource, SettingsService) {
    var self = this;

    // Given a body of text suggest a template
    self.suggest = function (query) {
        var deferred = $q.defer();

        SettingsService.get('apiBaseURL').then(function (apiBaseURL) {
            var url = 'quicktexts/suggest/';
            if (query.helpdesk) {
                url = 'helpdesk/suggest/';
            }

            var suggestRes = $resource(apiBaseURL + url);

            SettingsService.get('settings').then(function (settings) {
                if (!settings.suggestions.enabled) {
                    deferred.resolve([]);
                }

                var suggest = new suggestRes();
                angular.copy(query, suggest);

                suggest.$save(function (data) {
                    deferred.resolve(data.templates);
                });
            });
        });


        return deferred.promise;
    };

    // Given a body of text suggest a template
    self.stats = function (data) {
        var deferred = $q.defer();

        SettingsService.get('apiBaseURL').then(function (apiBaseURL) {
            var res = $resource(apiBaseURL + 'helpdesk/stats');

            var stat = new res();
            stat.url = data.url;
            stat.agent = data.agent;
            stat.template_id = data.template_id;
            stat.$save(function () {
                deferred.resolve();
            });
        });
        return deferred.promise;
    };

    // Check if we have an enabled helpdesk
    self.enabled = function (query) {
        var deferred = $q.defer();

        SettingsService.get('apiBaseURL').then(function (apiBaseURL) {
            var suggestRes = $resource(apiBaseURL + 'helpdesk/enabled/:domain', {'domain': '@domain'});
            var suggest = new suggestRes();
            suggest.$get(query, function (data) {
                deferred.resolve(data.enabled);
            });
        });

        return deferred.promise;
    };
});


// Settings
gApp.service('SettingsService', function ($q) {
    var self = this;
    self.get = function (key, def) {
        var deferred = $q.defer();
        Settings.get(key, def, function (data) {
            deferred.resolve(data);
        });
        return deferred.promise;
    };
    self.set = function (key, val) {
        var deferred = $q.defer();
        Settings.set(key, val, function () {
            deferred.resolve();
        });
        return deferred.promise;
    };
    self.reset = function () {
        for (var k in Settings.defaults) {
            Settings.set(k, Settings.defaults[k], function () {
                // nothing to do here
            });
        }
    };
    return self;
});

// User Profile - check if the user is logged in. Get it's info
gApp.service('ProfileService', function ($q, SettingsService) {
    var self = this;

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

    self.words = function () {
        return SettingsService.get("words", 0);
    };

    self.savedWords = self.reduceNumbers(self.words);

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
    self.avgWPM = 25;
    self.savedTime = function () {
        var deferred = $q.defer();
        self.words().then(function (words) {
            deferred.resolve(self.niceTime(Math.round(words / self.avgWPM)));
        });
        return deferred.promise;
    };

    return self;
});
