/* Outlook plugin
 */

App.plugin('outlook', (function() {

    // get all required data from the dom
    var getData = function(params, callback) {

        var vars = {
            from: [],
            to: [],
            cc: [],
            bcc: [],
            subject: ''
        };

        if(callback) {
            callback(null, vars);
        }

    };

    var setTitle = function(params, callback) {

        var response = {};

        var $subjectField = $('input[name=fSubject]');
        $subjectField.val(params.subject);

        if(callback) {
            callback(null, response);
        }

    };

    var init = function(params, callback) {

        var outlookUrl = '.mail.live.com/';

        var activateExtension = false;
        
        // trigger the extension based on url
        if(window.location.href.indexOf(outlookUrl) !== -1) {
            activateExtension = true;
        }

        // return true as response if plugin should be activated
        if(callback) {
            // first param is the error
            // second is the response
            callback(null, activateExtension);
        }

    };

    return {
        init: init,
        getData: getData,
        setTitle: setTitle
    }

})());
