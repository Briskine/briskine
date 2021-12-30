import Handlebars from 'handlebars';
import './date.js';
import './moment.js';

// This is useful for template variables
Handlebars.registerHelper('or', function (first, second) {
    return first || second;
});

Handlebars.registerHelper("splitString", function (context, options) {
    if (context) {
        var ret = "";

        var tempArr = context.trim().split(options.hash.delimiter);
        for (var i = 0; i < tempArr.length; i++) {
            var data = Handlebars.createFrame(options.data || {});
            if (options.data) {
                data.index = i;
            }
            if (typeof options.hash.index !== "undefined" && options.hash.index === i) {
                return options.fn(tempArr[i], {data: data});
            } else {
                ret = ret + options.fn(tempArr[i], {data: data});
            }
        }
        return ret;
    }
});

// This is useful for template variables
Handlebars.registerHelper('capitalize', function (text) {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
});

Handlebars.registerHelper("choice", function (args) {
    // split by comma and trim
    args = args.split(',').map((a) => a.trim());
    return args[Math.floor(Math.random() * args.length)];
});

function underscored(str) {
    return str.replace(/([a-z\d])([A-Z]+)/g, '$1_$2').replace(/[-\s]+/g, '_').toLowerCase().trim();
}

function titleize(str) {
    return str.toLowerCase().replace(/(?:^|\s|-)\S/g, function (c) {
        return c.toUpperCase();
    });
}

function humanize(str) {
    return titleize(underscored(str).replace(/_id$/, '').replace(/_/g, ' '));
}

Handlebars.registerHelper('domain', function (text) {
    if (!text || typeof text !== 'string') {
        return text;
    }

    var split = text.split('@'); //contact@AWESOME-sweet-bakery.co.uk
    if (split.length !== 2) {
        return text;
    }
    var tld = split[1]; // AWESOME-sweet-bakery.co.uk
    var domain = tld.split('.')[0]; // AWESOME-sweet-bakery
    return humanize(domain); // Awesome Sweet Bakery
});
