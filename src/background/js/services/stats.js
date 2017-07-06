gApp.service('StatsService', function ($q, $resource, SettingsService) {
    var self = this

    self.res = $resource(Settings.defaults.apiBaseURL + 'templates/stats', {}, {
        get: {
            method: "GET"
        }
    })

    self.get = function (options) {
        var deferred = $q.defer()
        self.res.get(function (res) {
            deferred.resolve(res)
        })
        return deferred.promise
    }

    self.syncStatsTimer = null

    // should probably be called every few minutes or so
    self.sync = function () {
        SettingsService.get("isLoggedIn").then(function (isLoggedIn) {
            if (!isLoggedIn) {
                return
            }
            // only log stats for logged in users
            SettingsService.get("sendStatsEnabled").then(function (sendStatsEnabled) {
                if (sendStatsEnabled) { // do this only if user allowed sending anonymous statistics
                    SettingsService.get("words").then(function (words) {
                        SettingsService.get('syncedWords').then(function (syncedWords) {
                            var newWords = words - syncedWords
                            if (newWords > 0) {
                                var stats = new self.res()
                                stats.words = newWords
                                stats.$save(function () {
                                    SettingsService.set("syncedWords", words)
                                    SettingsService.set("lastStatsSync", new Date())
                                })
                            }
                        })
                    })
                }
            })
        })

        window.clearTimeout(self.syncStatsTimer)
        self.syncStatsTimer = window.setTimeout(self.sync, 1000) // every 15minutes
    }
    self.sync()
})
