gApp.service('gDrivePickerService', function($window) {
    var self = this;
    // The Browser API key obtained from the Google Developers Console.
    var clientId = '1049522365838-9f5rgq5dotmt1038j2rebof756m2f87k.apps.googleusercontent.com';

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

    function webAuthFlow(userEmail, forceApprovalPrompt) {
        var baseUrl = 'https://accounts.google.com/o/oauth2/auth';
        var forceApprovalPrompt = forceApprovalPrompt || 'auto';
        var urlParams = {
            'redirect_uri': 'https://'+chrome.runtime.id+'.chromiumapp.org/callback',
            'response_type': 'token',
            'client_id': clientId,
            'scope': scope[0],
            'approval_prompt': 'force',
            'include_granted_scopes': 'true'
        };

        var providerDetails = {
            url: baseUrl + '?' + stringify(urlParams),
            interactive: true
        }
        var callback = function(responseUrl) {
            var params = {},
                queryString = responseUrl.split('#')[1],
                regex = /([^&=]+)=([^&]*)/g,
                m,
                validateUrl = 'https://www.googleapis.com/oauth2/v1/tokeninfo'
            while (m = regex.exec(queryString)) {
                params[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
            }
            console.log(params.access_token);
            oauthToken = params.access_token;
            createPicker();
        };
        chrome.identity.launchWebAuthFlow(providerDetails, callback);
    };
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
