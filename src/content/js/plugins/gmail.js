/* Gmail plugin
 */

App.plugin('gmail', (function() {

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

    // TODO get all required variables from the dom (subject, name, etc.)
    var getData = function(params, callback) {

        var from = '',
            to = [],
            cc = [],
            bcc = [],
            subject = '';

        if (App.data.gmailView === 'basic html') {
            from = $('#guser').find('b').text();
            var toEl = $('#to');

            // Full options window
            if (toEl.length) {
                to = toEl.val().split(',');
                cc = $('#cc').val().split(',');
                bcc = $('#bcc').val().split(',');
                subject = $('input[name=subject]').val();
            } else { // Reply window
                subject = $('h2 b').text();
                var replyToAll = $('#replyall');
                // It there are multiple reply to options
                if (replyToAll.length) {
                    to = $('input[name=' + replyToAll.attr('name') + ']:checked').closest('tr').find('label')
                        // retrieve text but child nodes
                        .clone().children().remove().end().text().trim().split(',');
                } else {
                    to = $(params.element).closest('table').find('td').first().find('td').first()
                        // retrieve text but child nodes
                        .clone().children().remove().end().text().trim().split(',');
                }
            }
        } else if (App.data.gmailView === 'standard') {
            var $container = $(params.element).closest('table').parent().closest('table').parent().closest('table'),
                from_email = $container.find('input[name=from]').val(),
            // , from_name = $('span[email="'+from_email+'"]').length ? $('span[email="'+from_email+'"]').attr('name') : ''
            // Taking name based on Google+ avatar name
                fromNameEl = $('a[href^="https://plus.google.com/u/0/me"][title]'),
                fromName = fromNameEl.length ? fromNameEl.attr('title').split('\n')[0] : '';

            from = fromName + ' <' + from_email + '>';
            to = $container.find('input[name=to]').toArray().map(function (a) {
                return a.value;
            });
            cc = $container.find('input[name=cc]').toArray().map(function (a) {
                return a.value;
            });
            bcc = $container.find('input[name=bcc]').toArray().map(function (a) {
                return a.value;
            });
            subject = $container.find('input[name=subject]').val();
        }

        var vars = {
            from: parseList([from]),
            to: parseList(to),
            cc: parseList(cc),
            bcc: parseList(bcc),
            subject: subject
        };

        if(callback) {
            callback(null, vars);
        }

    };

    var init = function(params, callback) {

        var activateExtension = false;
        // TODO trigger the extension based on url
        // or something else, in extreme cases

        activateExtension = true;

        // return true as response if plugin should be activated
        if(callback) {
            // first param is the error
            // second is the response
            callback(null, activateExtension);
        }

    };

    return {
        init: init,
        getData: getData
    }

})());
