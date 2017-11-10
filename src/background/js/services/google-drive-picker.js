gApp.service('gDrivePickerService', function ($window) {
    var self = this;

    var pickerApiLoaded = false;
    var oauthToken;

    //getAuthToken for the picker
    function getAuthToken() {
        chrome.identity.getAuthToken({
            'interactive': true
        }, function (token) {
            oauthToken = token;
            createPicker();
        });
    }

    if (typeof gapi !== 'undefined') {
        //load picker script;
        gapi.load('picker', {
            'callback': onPickerApiLoad
        });

        function onPickerApiLoad() {
            pickerApiLoaded = true;
            createPicker();
        }

        /**
         * Callback invoked when interacting with the picker
         * data: Object returned by the API
         */
        function createPicker() {
            if (pickerApiLoaded && oauthToken) {
                var personalView = new google.picker.View(google.picker.ViewId.DOCS);
                var teamDriveView = new google.picker.DocsView()
                    .setEnableTeamDrives(true);

                self.picker = new google.picker.PickerBuilder()
                    .setOAuthToken(oauthToken)
                    .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
                    .enableFeature(google.picker.Feature.SUPPORT_TEAM_DRIVES)
                    .addView(personalView)
                    .addView(teamDriveView)
                    .setCallback(self.pickerResponse)
                    .build();

                self.picker.setVisible('true');
            }
        }

        self.onPickerClicked = function () {
            if (!self.picker) {
                getAuthToken();
            } else {
                self.picker.setVisible(true);
            }
        }
    }
});
