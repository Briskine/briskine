/* Yahoo plugin
 */

App.plugin('yahoo', (function() {

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

        var $composeContainer = $(params.element).parents('.compose').first();
        var $emailContainer = $composeContainer.prev('.thread-item');

        // get your name from the top-right profile
        var fromName = $('#yucs-profile b').first().text();
        var fromEmail = $('#yucs-profile-panel b + b').text();

        // get your own name from the top right
        var from = {
            name: fromName,
            first_name: '',
            last_name: '',
            email: fromEmail + '@yahoo.com'
        };

        var parsedName = parseName(fromName);

        from.first_name = parsedName.first_name;
        from.last_name = parsedName.last_name;

        vars.from.push(from);

        $composeContainer.find('#to li').each(function() {
            var $li = $(this);
            var liText = $li.text().trim();

            // TODO check if the liText is the name or the email

            if(liText) {
                var parsedLiName = parseName(liText);

                vars.to.push({
                    name: liText,
                    first_name: parsedLiName.first_name,
                    last_name: parsedLiName.last_name,
                    email: ''
                });
            }
        });

        if(callback) {
            callback(null, vars);
        }

    };

    var before = function (params, callback) {
        var $parent = $(params.element).closest('div.compose')

        if (params.quicktext.subject) {
            var parsedSubject = Handlebars.compile(params.quicktext.subject)(PrepareVars(params.data));
            var $subjectField = $('#subject-field', $parent);
            var newSubject = $subjectField.val() + parsedSubject;
            $subjectField.val(newSubject);
        }

        if (params.quicktext.to) {
            var parsedTo = Handlebars.compile(params.quicktext.to)(PrepareVars(params.data));
            var $toField = $('#to-field', $parent);
            $toField.val(parsedTo);

            $toField.get(0).dispatchEvent(new Event('blur'));
        }

        if (params.quicktext.cc ||
            params.quicktext.bcc) {
            // click show cc/bcc button
            var $btn = $('#cc_show_btn_in_to', $parent)
            $btn.get(0).click()
        }

        if (params.quicktext.cc) {
            var parsedCc = Handlebars.compile(params.quicktext.cc)(PrepareVars(params.data));
            var $ccField = $('#cc-field', $parent);
            $ccField.val(parsedCc);

            $ccField.get(0).dispatchEvent(new Event('blur'));
        }

        if (params.quicktext.bcc) {
            var parsedBcc = Handlebars.compile(params.quicktext.bcc)(PrepareVars(params.data));
            var $bccField = $('#bcc-field', $parent);
            $bccField.val(parsedBcc);

            $bccField.get(0).dispatchEvent(new Event('blur'));
        }

        if (callback) {
            callback(null, params);
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
        before: before
    }

})());
