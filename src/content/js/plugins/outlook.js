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

    var setField = function(params, callback) {
        getData(params, function (_, vars) {
            var $parent = $(params.element).closest('._mcp_61');
            var parsedValue = Handlebars.compile(params.value)(PrepareVars(vars));

            if (params.field === 'subject') {
                var $subjectField = $('input[aria-labelledby="MailCompose.SubjectWellLabel"]', $parent);

                $subjectField.val(parsedValue);
            }

            if ([ 'to', 'cc', 'bcc' ].indexOf(params.field) !== -1) {
                // click expand button, for reply.
                $('button._mcp_D2', $parent).trigger('click')
            }

            var $extraFields = $('._fp_C', $parent)
            var $btns = $('._mcp_e1', $parent)

            if (params.field === 'to') {
                $extraFields.eq(0).val(parsedValue);
            }

            // TODO does not work in Reply
            if (params.field === 'cc') {
                // click the cc button
                $btns.eq(0).trigger('click');
                $extraFields.eq(1).val(parsedValue);
            }

            if (params.field === 'bcc') {
                // click the bcc button
                $btns.eq(1).trigger('click');
                $extraFields.eq(2).val(parsedValue);
            }

            if(callback) {
                callback(null, {});
            }
        });
    };

    var before = function (params, callback) {
        // don't do anything if we don't have any extra fields
        if (!params.quicktext.subject &&
            !params.quicktext.to &&
            !params.quicktext.cc &&
            !params.quicktext.bcc
        ) {
            return callback(null)
        }

        // if we have any extra fields,
        // click expand button, for reply.
        var $parent = $(params.element).closest('._mcp_61');
        $('button._mcp_D2', $parent).trigger('click');

        // needs a sec to re-render the compose dom.
        setTimeout(function () {
            // after clicking the expand button,
            // the dom is recreated,
            // so we need to refresh the parent.
            var $parent = $('._mcp_61');

            if (params.quicktext.subject) {
                var parsedSubject = Handlebars.compile(params.quicktext.subject)(PrepareVars(params.data));
                var $subjectField = $('input[aria-labelledby="MailCompose.SubjectWellLabel"]', $parent);
                $subjectField.val(parsedSubject);
            }

            var parsedValue = 'parsed value';

            var $extraFields = $('._fp_C', $parent)
            var $btns = $('._mcp_e1', $parent)

            if (params.quicktext.to) {
                var parsedTo = Handlebars.compile(params.quicktext.to)(PrepareVars(params.data));
                $extraFields.eq(0).val(parsedTo);
            }

            if (params.quicktext.cc) {
                var parsedCc = Handlebars.compile(params.quicktext.cc)(PrepareVars(params.data));
                $btns.eq(0).trigger('click');
                $extraFields.eq(1).val(parsedCc);
            }

            if (params.quicktext.to) {
                var parsedBcc = Handlebars.compile(params.quicktext.bcc)(PrepareVars(params.data));
                $btns.eq(1).trigger('click');
                $extraFields.eq(2).val(parsedBcc);
            }

            // refresh the editor element.
            // outlook re-creates it.
            params.element = $('.ConsumerCED', $parent).get(0)

            if(callback) {
                callback(null, params);
            }
        }, 500);
    };

    var init = function(params, callback) {

        var outlookUrl = 'outlook.live.com/';

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
        before: before
    }

})());
