/*
 * Parse e-mail fields to, cc, bcc, subject and others.
 *
 * This is useful to populate the templates
 *
 * */

App.parser.getData = function (element) {
    return this.getFieldValues(element);
};

App.parser.getFieldValues = function (element) {
    var from = "",
        to = [],
        cc = [],
        bcc = [],
        subject = "";

    if (App.data.gmailView === 'basic html') {
        from = $('#guser').find('b').text();
        var toEl = $("#to");

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
                to = $(element).closest('table').find('td').first().find('td').first()
                    // retrieve text but child nodes
                    .clone().children().remove().end().text().trim().split(',');
            }
        }
    } else if (App.data.gmailView === 'standard') {
        var $container = $(element).closest('table').parent().closest('table').parent().closest('table'),
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

    return {
        from: App.parser.parseList([from]),
        to: App.parser.parseList(to),
        cc: App.parser.parseList(cc),
        bcc: App.parser.parseList(bcc),
        subject: subject
    };
};

App.parser.parseList = function (list) {
    return list.filter(function (a) {
        return a;
    }).map(function (a) {
        return App.parser.parseString(a);
    });
};

App.parser.regExString = /"?([^ ]*)\s*(.*)"?\s*<([^>]+)>/;
App.parser.regExEmail = /([\w!.%+\-])+@([\w\-])+(?:\.[\w\-]+)+/;

App.parser.parseString = function (string) {
    //XXX: Gmail changed the title to: Account  Firstname Lastname so we remove it
    string = string.replace("Account ", "");
    var match = App.parser.regExString.exec(string),
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
        match = App.parser.regExEmail.exec(string);
        if (match) {
            data.email = match[0];
        }
    }

    return data;
};
