gApp.service('MigrationService', function ($q, $resource, SettingsService, TemplateService) {
    var self = this;

    // Perform migrations in order
    self.migrate = function () {
        chrome.storage.sync.get('settings', function(settings){
            // if there are no settings, just reset the settings
            if (!(Object.getOwnPropertyNames(settings).length && settings.hasOwnProperty('settings'))) {
                SettingsService.reset();
                window.setTimeout(function() {
                    SettingsService.get('settings').then(function (settings) {
                        settings.editor.enabled = false; // disable editor for older versions that never enabled it
                        SettingsService.set('settings', settings);
                    });
                }, 3000);
            }
        });
    };
});
