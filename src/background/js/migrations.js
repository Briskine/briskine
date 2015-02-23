gqApp.service('MigrationService', function ($q, $resource, SettingsService, QuicktextService) {
    var self = this;
    // This is the last version that we need to get to
    var settings = SettingsService.get('settings');
    self.HEAD = settings.migration_head;
    if (!self.HEAD) {
        self.HEAD = 0;
    }

    self.migrations = [
        {
            description: 'Enable corresponding fields in the template form that have subject and tags',
            revision: 1,
            upgrade: function (callback) {
                QuicktextService.quicktexts().then(function (quicktexts) {
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
            }
        }
    ];

    // Perform migrations in order
    self.migrate = function () {
        var callback = function () {
            self.HEAD = m.target;
            settings.migration_head = m.revision;
            SettingsService.set('settings', settings);
        };

        for (var i in self.migrations) {
            var m = self.migrations[i];
            if (m.revision > self.HEAD) {
                m.upgrade(callback);
            }
        }
    };
});
