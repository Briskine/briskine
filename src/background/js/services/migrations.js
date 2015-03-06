gApp.service('MigrationService', function ($q, $resource, SettingsService, TemplateService, QuicktextService) {
    var self = this;

    // Perform migrations in order
    self.migrate = function () {
        SettingsService.get('settings').then(function (settings) {
            settings.shownInstallHint = true;
            SettingsService.set('settings', settings);
        });
    };
});
