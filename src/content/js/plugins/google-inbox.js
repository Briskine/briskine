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

        // editor container classNames:
        // .n7 for message popup
        // .nG for inline reply
        // only one is rendered at a time.
        // default to popup.
        nodes.mode = 'popup';
        nodes.container = jQuery(element).closest('.n7');

        // detect if in message popup or inline.
        if (nodes.container.length) {
            // popup.
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
        } else {
            // inline reply
            nodes.mode = 'inline';
            nodes.container = jQuery(element).closest('.nG');

            var $receivers = nodes.container.prev('.kX').find('[email]');

            // in inline reply, all receivers are a single-level list.
            // since we no way of knowing which is to/cc/bcc,
            // we naively handle them by index.
            ['to', 'cc', 'bcc'].forEach(function (type, index) {
                if ($receivers.eq(index).length) {
                    return nodes[type] = $receivers.eq(index)
                }
            });

            // normalize the subject as an input
            nodes.subject = jQuery(document.createElement('input'))
            nodes.subject.val(nodes.container.closest('.aY').find('[role="heading"] .eo').text());
        }

        return nodes
    };

    // get all required data from the dom
    var getData = function (params, callback) {
        var vars = {
            from: {},
            to: [],
            cc: [],
            bcc: [],
            subject: ''
        }

        // account information
        var $accountContainer = jQuery('.gb_lb.gb_ga');

        // from
        var name = $accountContainer.find('.gb_ub').text()
        vars.from = jQuery.extend({
            name: name,
            email: $accountContainer.find('.gb_vb').text()
        }, splitFullName(name));

        var nodes = getNodes(params.element);
        ['to', 'cc', 'bcc'].forEach(function (receiver) {
            if (!nodes[receiver]) {
                return
            }

            var $field = nodes[receiver]
            var name = ''

            // inline sends the [email] node,
            // popup sends the [email] node container.
            if (nodes.mode === 'inline') {
                // inline.
                name = $field.text()
            } else {
                // popup.
                // when a receiver is deleted, the node is still there but display:none.
                $field = $field.find('[email]:visible').eq(0);
                if (!$field.length) {
                    return;
                }

                name = $field.attr('aria-label')
            }

            vars[receiver].push(jQuery.extend({
                name: name,
                email: $field.attr('email')
            }, splitFullName(name)));
        })

        // subject
        vars.subject = nodes.subject.val();

        if (callback) {
            callback(null, vars);
        }
    };

    var before = function (params, callback) {
        var nodes = getNodes(params.element);

        // if in inline-reply mode,
        // and has to populate any fields (to/cc/bcc/subject),
        // open the popup.
        if (nodes.mode === 'inline' && (
            params.quicktext.to ||
            params.quicktext.cc ||
            params.quicktext.bcc ||
            params.quicktext.subject
        )) {
            // click the pop-out button
            nodes.container.closest('.bc').find('[jsaction*="quick_compose_popout_mole"]').trigger('click')

            // focus moves to the popup,
            // so update the element and focusNode refs.
            // sometimes the popup does not open fast enough,
            // and the activeElement is still in inline cursor,
            // so we need the timeout trick.
            setTimeout(function () {
                params.element = document.activeElement;
                var selection = document.getSelection();
                params.focusNode = selection.focusNode;

                fillFields(params);

                callback(null, params)
            })
        } else {
            fillFields(params);

            // TODO make sure to always provide a callback in core,
            // so we don't have to do these checks in plugins.
            if (callback) {
                callback(null, params);
            }
        }
    }

    // can't use after(),
    // because it messes with the focus.
    var fillFields = function (params) {
        var nodes = getNodes(params.element);

        if (params.quicktext.subject) {
            var parsedSubject = Handlebars.compile(params.quicktext.subject)(PrepareVars(params.data));
            var newSubject = nodes.subject.val() + parsedSubject;
            nodes.subject.val(newSubject);
        }

        // to, cc and bcc inputs need a blur event to save the values.
        var blurEvent = new Event('blur');

        if (params.quicktext.to) {
            // TODO in the future,
            // plugins should get params.quicktext.to already parsed.
            // so we don't have to use Handlebars.compile and PrepareVars in plugins.
            var parsedTo = Handlebars.compile(params.quicktext.to)(PrepareVars(params.data));
            var $toField = nodes.to.find('input');
            $toField.val(parsedTo);

            // blur event to save the value
            $toField.get(0).dispatchEvent(blurEvent);
        }

        if (params.quicktext.cc || params.quicktext.bcc) {
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
        });
    };

    var after = function (params, callback) {
        // inserting a template while the placeholder text is still visible,
        // needs a manual event trigger.
        var inputEvent = new Event('input');
        params.element.dispatchEvent(inputEvent);

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
        before: before,
        after: after
    }
})());
