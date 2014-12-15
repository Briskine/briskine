/* Linkedin plugin
 */

App.plugin('linkedin', (function() {

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
            subject: ''
        };

        var $fromContainer= $('.account-toggle');
        var fromName = $fromContainer.find('.nav-profile-photo').attr("alt");
        var fromAddress = "";

        var from = {
            name: fromName,
            first_name: '',
            last_name: '',
            email: ""
        };

        var parsedName = parseName(fromName);

        from.first_name = parsedName.first_name;
        from.last_name = parsedName.last_name;

        vars.from.push(from);

        var $contact = $('#compose-dialog-member-name');
        if ($contact.length) {
            var parsedName = parseName($contact.text());
            var to = {
                name: name,
                first_name: '',
                last_name: '',
                email: ''
            };

            to.first_name = parsedName.first_name;
            to.last_name = parsedName.last_name;
            vars.to.push(to);
        } else {
            $('#recipients-composeForm .beanName').each(function(){
                var parsedName = parseName($(this).text());
                var to = {
                    name: name,
                    first_name: '',
                    last_name: '',
                    email: ''
                };

                to.first_name = parsedName.first_name;
                to.last_name = parsedName.last_name;
                vars.to.push(to);
            });
        }

        if(callback) {
            callback(null, vars);
        }

    };

    var setTitle = function(params, callback) {

        var response = {};

        var $subjectField = $('#subject-msgForm', window.parent.document);
        $subjectField.val(params.subject);

        if(callback) {
            callback(null, response);
        }

    };

    var init = function(params, callback) {

        var url = '.linkedin.com/';

        var activateExtension = false;

        // trigger the extension based on url
        if(window.location.href.indexOf(url) !== -1) {
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
