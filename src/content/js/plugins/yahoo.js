/* Yahoo plugin
 */

App.plugin('yahoo', (function() {

    // get all required data from the dom
    var getData = function(params, callback) {

        var vars = {
            from: [],
            to: [],
            cc: [],
            bcc: [],
            subject: subject
        };

        var $composeContainer = $(params.element).parents('.thread-item').first();
        var $emailContainer = $composeContainer.prev('.thread-item');

        // get your name from the top-right profile
        var fromName = $('#yucs-profile b').first().text();
        var fromEmail = $('#yucs-profile-panel b + b').text();

        // get your own name from somewhere
        vars.from.push({
            name: fromName,
            first_name: '',
            last_name: '',
            email: fromEmail + '@yahoo.com'
        });

        $composeContainer.find('#to li').each(function() {
            var $li = $(this);
            var liText = $li.text().trim();

            // TODO check if the liText is the name or the email

            if(liText) {
                vars.to.push({
                    name: liText,
                    first_name: '',
                    last_name: '',
                    email: ''
                });
            }
        });

        if(callback) {
            callback(null, vars);
        }

    };

    var setTitle = function(params, callback) {

        var response = {};

        var $subjectField = $('#subject-field');
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
