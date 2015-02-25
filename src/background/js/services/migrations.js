gApp.service('MigrationService', function ($q, $resource, SettingsService, QuicktextService) {
    var self = this;

    self.migrations = [
        {
            description: 'Enable template fields if we have templates containing subject or tags',
            revision: 1,
            upgrade: function (callback) {
                QuicktextService.quicktexts().then(function (quicktexts) {
                    SettingsService.get('settings').then(function (settings) {
                        settings.fields.subject = false;
                        settings.fields.tags = false;

                        for (var i in quicktexts) {
                            var q = quicktexts[i];
                            if (q.subject) {
                                settings.fields.subject = true;
                            }
                            if (q.tags) {
                                settings.fields.tags = true;
                            }

                        }
                        SettingsService.set('settings', settings);
                        callback();
                    });
                });
            }
        },
        {
            description: 'Migrating from window.localStorage to chrome.storage',
            revision: 2,
            upgrade: function (callback) {
                // if chrome.storage is not present then there is nothing to do
                if (!(chrome && chrome.storage)) {
                    return;
                }

                var data = {};
                for (var i = 0; i < localStorage.length; i++) {
                    var key = localStorage.key(i);
                    data[key] = JSON.parse(localStorage[key]);
                }

                chrome.storage.sync.set(data, function () {
                    _.each(_.keys(data), function(k){
                        localStorage.removeItem(k);
                    });
                    callback();
                });
            }
        }
    ];

    // Perform migrations in order
    self.migrate = function () {
        SettingsService.get('settings').then(function (settings) {
            // This is the last version that we upgraded to
            self.HEAD = settings.migration_head;
            if (!self.HEAD) { // if not set assume that we never ran any migrations
                self.HEAD = 0;
            }

            var run = function() {
                _.each(self.migrations, function(m){
                    // each migration upon finishing runs the next migration
                    // It's done recursively because of the async callbacks
                    if (m.revision === self.HEAD + 1) {
                        console.log("Migrating", m);
                        // upgrade and call the callback that increments the HEAD
                        m.upgrade(function () {
                            SettingsService.get('settings').then(function (settings) {
                                self.HEAD = m.revision;
                                // persist in the storage
                                settings.migration_head = m.revision;
                                SettingsService.set('settings', settings);
                                // finally run another migration
                                run();
                            });
                        });
                        return false;
                    }
                });
            };

            // Run migrations
            run();
        });
    };
});
