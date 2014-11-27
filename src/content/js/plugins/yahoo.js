/* Yahoo plugin
 */

App.plugin('yahoo', (function() {

    // get all required data from the dom
    var getData = function(params, callback) {

        // TODO should from also be an array
        // or just an object?
        // currently the gmail plugin sends it as a one-element array

        var vars = {
            from: {},
            to: [],
            cc: [],
            bcc: [],
            subject: subject
        };

        var $composeContainer = $(params.element).parents('.thread-item').first();
        var $emailContainer = $composeContainer.prev('.thread-item');

        // TODO not good
        // get your own name from somewhere
        vars.from.name = $emailContainer.find('.from').text();

        $composeContainer.find('#to li').each(function() {
            var $li = $(this);
            var liText = $li.text().trim();
            if(liText) {
                vars.to.push({
                    name: liText
                });
            }
        });

        if(callback) {
            callback(null, vars);
        }

    };

    var setTitle = function(params, callback) {

        // TODO this is just copied from gmail
        var response = {};

        var $subjectField = $('input[name=subjectbox]');
        $subjectField.val(params.subject);

        if(callback) {
            callback(null, response);
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
        getData: getData,
        setTitle: setTitle
    }

})());
