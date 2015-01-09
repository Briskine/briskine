/* Facebook plugin
 */

App.plugin('facebook', (function() {

    var parseName = function(name) {
        name = name.trim();

        var firstSpace = name.indexOf(' ');

        if(firstSpace === -1) {
            firstSpace = name.length;
        }

        var first_name = name.substring(0, firstSpace);
        var last_name = name.substring(firstSpace + 1, name.length);

        return {
            first_name: first_name,
            last_name: last_name
        }
    };

    // get all required data from the dom
    var getData = function(params, callback) {

        var vars = {
            from: [],
            to: []
        };

        var fromName = $('a[title="Profile"]').text();
        var from = {
            name: fromName,
            first_name: fromName,
            last_name: '',
            email: ""
        };
        vars.from.push(from);

        var contacts = $('input[name="text_participants[]"]');
        if (contacts.length) {
            contacts.each(function(i, contact){
                var parsedName = parseName($(contact).val());
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
        } else {
            var contact = $('.focusedTab .titlebarText');
            if (contact.length) {
                var parsedName = parseName(contact.text());
                var to = {
                    name: name,
                    first_name: '',
                    last_name: '',
                    email: ''
                };

                to.first_name = parsedName.first_name;
                to.last_name = parsedName.last_name;
                vars.to.push(to);
            }

        }

        if(callback) {
            callback(null, vars);
        }

    };

    var setTitle = function(params, callback) {
        // there is no title on Facebook
        if(callback) {
            callback(null, {});
        }

    };

    var init = function(params, callback) {
        var url = '.facebook.com/';
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
