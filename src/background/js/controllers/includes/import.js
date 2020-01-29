import Papa from 'papaparse';

export default function ImportCtrl ($scope, $rootScope, $timeout) {
    var self = this;
    self.uploading = false;

    // legacy api import
    var handleErrors = function (response) {
        if (!response.ok) {
            return response.clone().json().then((res) => {
                return Promise.reject(res);
            });
        }
        return response;
    };

    function legacyImport (params = {}) {
        var formData = new FormData();
        formData.append('file', params.file);
        return fetch(`${Config.apiBaseURL}quicktexts/import`, {
            method: 'POST',
            body: formData
        })
        .then(handleErrors)
        .then((res) => res.json());
    }

    // firebase import
    function firebaseImport (params = {}) {
        return new Promise((resolve, reject) => {
            Papa.parse(params.file, {
                header: true,
                skipEmptyLines: true,
                complete: (res) => {
                    Promise.all(res.data.map((template) => {
                        return importTemplate(template);
                    })).then(resolve);
                },
                error: (err) => {
                    reject(err);
                }
            });
        });
    }

    // import a single template into firestore
    function importTemplate (template = {}) {
        return store.getTemplate().then((res) => {
            // skip existing templates
            var existing = res[template.id];
            if (existing) {
                return;
            }

            // we don't have a template with this id:
            // - template doesn't have an id
            // - template was deleted
            // - template is from different account

            // skip if we have a template with the same shortcut.
            var existingShortcut = Object.keys(res).find((id) => {
                return res[id].shortcut === template.shortcut;
            });
            if (existingShortcut) {
                return;
            }

            delete template.id;
            return store.createTemplate({
                template: template
            });
        });
    }

    self.onFileSelect = function (file) {
        // file was already selected
        if (!file) {
            return;
        }

        amplitude.getInstance().logEvent("Imported template");

        self.uploading = true;
        var importParams = {
            file: file
        };
        return store.importTemplates(importParams)
            .then((res) => {
                if (res.firebase) {
                    return firebaseImport(importParams);
                }

                return legacyImport(importParams);
            }).then(() => {
                $timeout(function() {
                    $rootScope.$broadcast('templates-sync');
                    self.uploading = false;
                    $('#import-modal').modal('hide');
                }, 3000);
            });
    };
}
