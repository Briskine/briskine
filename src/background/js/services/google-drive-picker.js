gApp.service('gDrivePickerService', function($window) {
    var self = this;
    // The Browser API key obtained from the Google Developers Console.
    var clientId = '1049522365838-9f5rgq5dotmt1038j2rebof756m2f87k.apps.googleusercontent.com';

    var scope = ['https://www.googleapis.com/auth/drive'];

    var pickerApiLoaded = false;
    var oauthToken;
    //getAuthToken for the picker
    chrome.identity.getAuthToken({
        'interactive': true
    }, function(token) {
        oauthToken = token;
        createPicker();
    });
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
    self.pickerResponse;

    function createPicker() {
        if (pickerApiLoaded && oauthToken) {
            self.picker = new google.picker.PickerBuilder().
            addView(google.picker.ViewId.DOCS).
            setOAuthToken(oauthToken).
            enableFeature('multiselectEnabled').
            setCallback(self.pickerResponse).
            build();
        }
    }

    self.onPickerClicked = function() {
        self.picker.setVisible(true);
    }
});
