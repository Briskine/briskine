gApp.service('gDrivePickerService', function($window) {
    var self = this;

    var scope = ['https://www.googleapis.com/auth/drive'];

    var pickerApiLoaded = false;
    var oauthToken;

    //getAuthToken for the picker
    function getAuthToken() {
      chrome.identity.getAuthToken({
        'interactive': true
      }, function(token) {
        oauthToken = token;
        createPicker();
      });
    }
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
            self.picker.setVisible('true');
        }
    }

    self.onPickerClicked = function() {
      if(!self.picker) {
        getAuthToken();
      } else {
        self.picker.setVisible(true);
      }
    }
});
