App.plugin('uservoice', (function () {

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
        //XXX: Gmail changed the title to: Account  Firstname Lastname so we remove it
        string = string.replace('Account ', '');
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
    var getData = function (params, callback) {

        var from = [],
            to = [],
            cc = [],
            bcc = [],
            subject = $('.ticket-subject-header').text().trim();

        var mailRows = $('.ticket-contact-summary .ticket-contact-summary-row');
        if (mailRows.length) {
            to = parseString(mailRows.eq(0).find('.ticket-contact-summary-values').text().trim());
            from = parseString(mailRows.eq(-1).text().trim().split('From:')[1].trim());
            // todo(@xarg): implement CC and BCC
        }

        var vars = {
            to: [to],
            from: [from],
            cc: cc,
            bcc: bcc,
            subject: subject
        };

        if (callback) {
            callback(null, vars);
        }

    };

    var setTitle = function (params, callback) {

        var response = {};

        var $subjectField = $('input[name=subjectbox]');
        $subjectField.val(params.subject);

        if (callback) {
            callback(null, response);
        }

    };

    var init = function (params, callback) {

        var url = 'uservoice.com';

        var activateExtension = false;

        var intervals = [];

        // trigger the extension based on url
        if (window.location.href.indexOf(url) !== -1) {
            activateExtension = true;
            // Load Gorgias on iframes
            var pollLoad = function(timeout){
                intervals.push(window.setInterval(function () {
                    var iframe = $('iframe.wysihtml5-sandbox').get(0);
                    if (iframe) {
                        Mousetrap.init(iframe.contentDocument);
                        App.settings.fetchSettings(App.init, iframe.contentDocument);
                    }
                }, timeout));
            };
            // We need to poll here because the iframe is loaded dynamically
            pollLoad(1000);
            //cleanIntervals(60 * 60 * 1000);
            //pollLoad(1000);
            //pollLoad(3000);
        }

        // return true as response if plugin should be activated
        if (callback) {
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
