gApp.controller('ImportCtrl', function ($scope, $rootScope, $timeout) {
    var self = this;
    self.uploading = false;

    self.onFileSelect = function (file) {
        amplitude.getInstance().logEvent("Imported template");

        self.uploading = true;
        return store.importTemplates({
            file: file
        }).then(() => {
            $timeout(function() {
                $rootScope.$broadcast('templates-sync');
                self.uploading = false;
                $('#import-modal').modal('hide');
            }, 3000);
        });
    };
});
