/* Fastmail plugin
 */

App.plugin('fastmail', (function() {

    var parseList = function (list) {
        return list.filter(function (a) {
            return a;
        }).map(function (a) {
            return parseString(a);
        });
    };

    var regExString = /"?([^ ]*)\s*(.*)"?\s*<([^>]+)>/;
    var regExEmail = /([\w!.%+\-])+@([\w\-])+(?:\.[\w\-]+)+/;

    var parseString = function (string) {
        var match = regExString.exec(string),
            data = {
                name: '',
                first_name: '',
                last_name: '',
                email: ''
            };

        if (match && match.length >= 4) {
            data.first_name = App.utils.getCapsonBegin(match[1].replace('"', '').trim())
            data.last_name = match[2].replace('"', '').trim();
            data.name = data.first_name + (data.first_name && data.last_name ? ' ' : '') + data.last_name;
            data.email = match[3];
        } else {
            // try to match the email
            match = regExEmail.exec(string);
            if (match) {
                data.email = match[0];
            }
        }

        return data;
    };

    // get all required data from the dom
    var getData = function(params, callback) {

        var from = [],
            to = [],
            cc = [],
            bcc = [],
            subject = '';

        var $container = $('.v-Compose');
        from = $container.find('.v-ComposeFrom-bottom select option').toArray().map(function (a) {
            return $(a).text();
        });

        to = $container.find('textarea[id$="to-input"]').toArray().map(function (a) {
            return a.value;
        });
        cc = $container.find('textarea[id$="cc-input"]').toArray().map(function (a) {
            return a.value;
        });
        bcc = $container.find('textarea[id$="cc-input"]').toArray().map(function (a) {
            return a.value;
        });
        subject = $container.find('input[id$="subject-input"]').val();

        var vars = {
            from: parseList(from),
            to: parseList(to),
            cc: parseList(cc),
            bcc: parseList(bcc),
            subject: subject
        };
        if(callback) {
            callback(null, vars);
        }

    };

    var isHidden = function (el) {
        return (el.offsetParent === null)
    }

    var before = function (params, callback) {
        var $parent = $(params.element).closest('.v-Compose')

        if (params.quicktext.subject) {
            var parsedSubject = Handlebars.compile(params.quicktext.subject)(PrepareVars(params.data));
            $('input[id$="subject-input"]', $parent).val(parsedSubject);
        }

        if (params.quicktext.to) {
            var parsedTo = Handlebars.compile(params.quicktext.to)(PrepareVars(params.data));
            var $toField = $('textarea[id$="to-input"]', $parent)
            $toField.val(parsedTo);

            // jQuery's trigger does not work
            $toField.get(0).dispatchEvent(new Event('input'));
        }

        var $btns = $('.v-Compose-addCcBcc .u-subtleLink', $parent);

        if (params.quicktext.cc) {
            var parsedCc = Handlebars.compile(params.quicktext.cc)(PrepareVars(params.data));

            var $ccField = $('textarea[id$="cc-input"]', $parent);

            // only if the cc field is hidden,
            // because the same button is used to show/hide the field.
            if (isHidden($ccField.get(0))) {
                var $ccBtn = $btns.eq(0);
                // dispatchEvent or trigger do not work
                $ccBtn.get(0).click();
            }

            $ccField.val(parsedCc);

            $ccField.get(0).dispatchEvent(new Event('input'));
        }

        if (params.quicktext.bcc) {
            var parsedBcc = Handlebars.compile(params.quicktext.bcc)(PrepareVars(params.data));

            var $bccField = $('textarea[id$="bcc-input"]', $parent);

            // only if the bcc field is hidden
            if (isHidden($bccField.get(0))) {
                var $bccBtn = $btns.eq(1);
                // dispatchEvent or trigger do not work
                $bccBtn.get(0).click();
            }

            $bccField.val(parsedBcc);

            $bccField.get(0).dispatchEvent(new Event('input'));
        }

        if (callback) {
            callback(null, params);
        }
    };

    var init = function(params, callback) {

        var url = '//www.fastmail.com/';

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
        before: before
    }

})());
