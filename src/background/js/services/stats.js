export default function StatsService ($q, $rootScope, SettingsService) {
    'ngInject';
    var self = this;
    self.get = function () {
        var deferred = $q.defer();
        store.getStats().then(deferred.resolve);
        return deferred.promise;
    };

    self.syncStatsTimer = null;

    // should probably be called every few minutes or so
    self.sync = function () {
        SettingsService.get("isLoggedIn").then(function (isLoggedIn) {
            if (!isLoggedIn) {
                return;
            }
            // only log stats for logged in users
            SettingsService.get("settings").then(function (settings) {
                var sendStatsEnabled = false;
                if (settings &&
                    settings.stats &&
                    settings.stats.enabled) {
                    sendStatsEnabled = true;
                }

                if (sendStatsEnabled) { // do this only if user allowed sending anonymous statistics
                    SettingsService.get("words").then(function (words) {
                        SettingsService.get('syncedWords').then(function (syncedWords) {
                            var newWords = words - syncedWords;
                            if (newWords > 0) {
                                store.updateStats({
                                    words: newWords
                                }).then(() => {
                                    SettingsService.set("syncedWords", words);
                                    SettingsService.set("lastStatsSync", new Date());
                                });
                            }
                        });
                    });
                }
            });
        });

        window.clearTimeout(self.syncStatsTimer);
        // 15 mins
        var syncTime = 1000 * 60 * 15;
        self.syncStatsTimer = window.setTimeout(self.sync, syncTime);
    };
    self.sync();
}
