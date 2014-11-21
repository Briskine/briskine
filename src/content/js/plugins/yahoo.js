/* Yahoo plugin
 */

App.plugin('yahoo', (function() {

    // get all required data from the dom
    var getData = function(params, callback) {

        var vars = {
            from: '',
            to: [],
            cc: [],
            bcc: [],
            subject: subject
        };

        if(callback) {
            callback(null, vars);
        }

    };

    var init = function(params, callback) {

        var yahooUrl = '.mail.yahoo.com/';

        var activateExtension = false;
        
        // trigger the extension based on url
        if(window.location.href.indexOf(yahooUrl) !== -1) {
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
        getData: getData
    }

})());
