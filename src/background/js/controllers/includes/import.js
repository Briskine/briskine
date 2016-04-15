gApp.controller('ImportCtrl', function ($scope, $rootScope, $timeout, Upload) {
    var self = this;

    // Importing Thunderbird quicktexts
    self.onFileSelect = function (file) {
        amplitude.logEvent("Imported template");

        $('#file-upload-progress').removeClass('hide');
        $('#file-upload-progress .progress-note').removeClass('hide');

        //var file = $files[0];
        Upload.upload({
            url: Settings.defaults.apiBaseURL + 'quicktexts/import',
            file: file
        }).progress(function (evt) {
            //TODO: try to find a way to make this work in the future
            $('#file-upload-progress .progress-bar').animate({'width': toString(parseInt(100.0 * evt.loaded / evt.total)) + "%"});
        }).success(function (data, status, headers, config) {
            $timeout($rootScope.$broadcast('templates-sync'), 6000).then(function() {
                $('#file-upload-progress .progress-bar').animate({'width': "100%"}).promise().then(function () {
                    // file is uploaded successfully
                    $timeout(function() {
                        $('#import-modal').modal('hide');
                        $('#file-upload-progress').addClass('hide');
                    }, 500);
                });
            });
        });
    };
});
