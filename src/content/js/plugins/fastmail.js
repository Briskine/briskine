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
            data.first_name = match[1].replace('"', '').trim();
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

    var setTitle = function(params, callback) {

        var response = {};

        var $subjectField = $('input[id$="subject-input"]');
        $subjectField.val(params.subject);

        if(callback) {
            callback(null, response);
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
        setTitle: setTitle
    }

})());
