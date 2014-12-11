/* Outlook plugin
 */

App.plugin('outlook', (function() {

    var parseName = function(name) {
        name = name.trim();

        var first_name = '';
        var last_name = '';

        var firstSpace = name.indexOf(' ');

        if(firstSpace === -1) {
            firstSpace = name.length;
        }

        first_name = name.substring(0, firstSpace);
        last_name = name.substring(firstSpace + 1, name.length);

        return {
            first_name: first_name,
            last_name: last_name
        }
    };

    // get all required data from the dom
    var getData = function(params, callback) {

        var vars = {
            from: [],
            to: [],
            cc: [],
            bcc: [],
            subject: ''
        };

        var $fromContainer= $('.FromContainer', window.parent.document);
        var fromName = $fromContainer.find('.Name').text();
        var fromAddress = $fromContainer.find('.Address').text();

        var from = {
           name: fromName,
           first_name: '',
           last_name: '',
           email: fromAddress
        };

        // in case we didn't get the name from .fromContainer
        // try to get it from the top right
        if(!fromName || !fromName.trim()) {
            fromName = $('#c_meun', window.parent.document).text();
        };

        var parsedName = parseName(fromName);

        from.first_name = parsedName.first_name;
        from.last_name = parsedName.last_name;

        vars.from.push(from);

        var $toContacts = $('#toCP .cp_Contact', window.parent.document);
        var $contact;
        var email;

        $toContacts.each(function() {
            $contact = $(this).find('a:first');
            email = $contact.next('.hideText').text();

            var name = $contact.text();
            var parsedName = parseName(name);
            var to = {
                name: name,
                first_name: '',
                last_name: '',
                email: email.replace(/["<>;]/gi,'')
            };

            to.first_name = parsedName.first_name;
            to.last_name = parsedName.last_name;

            vars.to.push(to);

        });

        if(callback) {
            callback(null, vars);
        }

    };

    var setTitle = function(params, callback) {

        var response = {};

        var $subjectField = $('input[name=fSubject]', window.parent.document);
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
