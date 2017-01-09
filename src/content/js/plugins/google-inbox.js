/* Google Inbox plugin
 */

App.plugin('google-inbox', (function () {
    // split full name by last space.
    // TODO share this between plugins.
    var splitFullName = function (fullname) {
        fullname = fullname || ''

        var lastSpaceIndex = fullname.lastIndexOf(' ')
        if (lastSpaceIndex < 1) {
            lastSpaceIndex = fullname.length
        }

        return {
            first_name: fullname.substr(0, lastSpaceIndex),
            last_name: fullname.substr(lastSpaceIndex + 1)
        }
    }

    var getNodes = function (element) {
        var nodes = {}

        // .n7 for message popup
        // .nG for inline reply
        // only one is rendered at a time.
        nodes.container = jQuery(element).closest('.n7, .nG')

        // TODO detect if in message popup or inline.
        // currently only works message popup.
        // TODO inline reply
        // var $meta = nodes.container.prev('.kX')

        // to, cc, bcc
        var receivers = [
            { type: 'to', className: '.Fv' },
            { type: 'cc', className: '.fD' },
            { type: 'bcc', className: '.fx' }
        ];

        receivers.forEach(function (receiver) {
            var $fieldContainer = nodes.container.siblings(receiver.className);
            // return the field container node,
            // so we can get different child nodes for read-write.
            nodes[receiver.type] = $fieldContainer;
        });

        // subject
        nodes.subject = nodes.container.siblings('.iO').find('input');

        return nodes
    };

    // get all required data from the dom
    var getData = function (params, callback) {
        var vars = {
            from: {},
            to: {},
            cc: {},
            bcc: {},
            subject: ''
        }

        // account information
        var $accountContainer = jQuery('.gb_lb.gb_ga');

        // from
        vars.from.name = $accountContainer.find('.gb_ub').text();
        jQuery.extend(vars.from, splitFullName(vars.from.name));
        vars.from.email = $accountContainer.find('.gb_vb').text();

        // editor container
        var nodes = getNodes(params.element);
        ['to', 'cc', 'bcc'].forEach(function (receiver) {
            // when a receiver is deleted, the node is still there but display:none.
            var $field = nodes[receiver].find('[email]:visible').eq(0);
            if (!$field.length) {
                return;
            }

            vars[receiver] = {
                name: $field.attr('aria-label'),
                email: $field.attr('email')
            }

            jQuery.extend(vars[receiver], splitFullName(vars[receiver].name))
        })

        // subject
        vars.subject = nodes.subject.val();

        if (callback) {
            callback(null, vars);
        }
    };

    var before = function (params, callback) {
        var nodes = getNodes(params.element)

        if (params.quicktext.subject) {
            var parsedSubject = Handlebars.compile(params.quicktext.subject)(PrepareVars(params.data));
            var newSubject = nodes.subject.val() + parsedSubject;
            nodes.subject.val(newSubject);
        }

        // to, cc and bcc inputs need a blur event to save the values.
        var blurEvent = new Event('blur');

        if (params.quicktext.to) {
            // TODO in the future plugins should get params.quicktext.to already parsed.
            // so we don't have to use Handlebars.compile and PrepareVars in plugins.
            var parsedTo = Handlebars.compile(params.quicktext.to)(PrepareVars(params.data));
            var $toField = nodes.to.find('input');
            $toField.val(parsedTo);

            // blur event to save the value
            $toField.get(0).dispatchEvent(blurEvent);
        }

        if (params.quicktext.cc ||
            params.quicktext.bcc
        ) {
            // click the extra receivers buttons,
            // if fields are hidden.
            if (!nodes.cc.is(':visible')) {
                nodes.to.find('[jsaction*="toggle_cc_bcc"]').trigger('click')
            }
        }

        ['cc', 'bcc'].forEach(function (type) {
            if (params.quicktext[type]) {
                var parsed = Handlebars.compile(params.quicktext.cc)(PrepareVars(params.data));
                var $field = nodes[type].find('input');
                $field.val(parsed);

                $field.get(0).dispatchEvent(blurEvent);
            }
        })

        if (callback) {
            callback(null, params);
        }
    };

    var init = function (params, callback) {
        var ginboxUrl = '//inbox.google.com/';

        var activateExtension = false;

        // trigger the extension based on url
        if (window.location.href.indexOf(ginboxUrl) !== -1) {
            activateExtension = true;
        }

        if (callback) {
            callback(null, activateExtension);
        }
    };

    return {
        init: init,
        getData: getData,
        before: before
    }
})());
