//  format a date using Moment.js
//  http://momentjs.com/
//  moment syntax example: moment(Date("2011-07-18T15:50:52")).format("MMMM YYYY")
//  usage: {{date '+7' 'days' "DD MMMM"}} -> 13 December
//  usage: {{date '-7' 'days' "DD MMMM YYYY"}} -> 29 November 2015
Handlebars.registerHelper('date', function (literal, unit, format) {
    format = typeof(format) === 'string' ? format : 'YYYY-MM-DD';
    unit = typeof(unit) === 'string' ? unit : 'days';

    if (typeof literal === 'string') {
        literal = parseInt(literal, 10);
    } else if (typeof literal !== 'number') {
        throw Error('Date literal ' + literal + ' should be string or number')
    }

    return moment().add(literal, unit).format(format);
});

// This is useful for template variables
Handlebars.registerHelper('or', function (first, second) {
    return first || second;
});

Handlebars.registerHelper("splitString", function (context, options) {
    if (context) {
        var ret = "";

        var tempArr = context.trim().split(options.hash["delimiter"]);
        for (var i = 0; i < tempArr.length; i++) {
            if (options.data) {
                data = Handlebars.createFrame(options.data || {});
                data.index = i;
            }
            if (typeof options.hash["index"] !== "undefined" && options.hash["index"] === i) {
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
    args = _.map(args.split(','), _.trim);
    return args[Math.floor(Math.random() * args.length)];
});

var PrepareVars = function (vars) {
    if (!vars) {
        return vars;
    }

    var prep = function (data) {
        // convert array to object
        data = _.extend({}, data);
        var flat = data[0];
        for (var i in flat) {
            if (flat.hasOwnProperty(i)) {
                data[i] = flat[i];
            }
        }
        return data;
    };

    if (vars.to && vars.to.length) {
        vars.to = prep(vars.to);
    }
    if (vars.from && vars.from.length) {
        vars.from = prep(vars.from);
    }
    if (vars.cc && vars.cc.length) {
        vars.cc = prep(vars.cc);
    }
    if (vars.bcc && vars.bcc.length) {
        vars.bcc = prep(vars.bcc);
    }
    return vars;
};

var getRandomIntInclusive = function (min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
};

// fuzzy search with fuse.js
var fuzzySearch = function (list, text, opts) {
    if (!text) {
        return list
    }

    var defaultOptions = {
        caseSensitive: false,
        shouldSort: true,
        tokenize: false,
        threshold: 0.6,
        location: 0,
        distance: 100,
        maxPatternLength: 32,
        // search templates by default
        keys: [
            {
                name: 'shortcut',
                weight: 0.7
            },
            {
                name: 'title',
                weight: 0.7
            },
            {
                name: 'body',
                weight: 0.4
            }
        ]
    };

    var options = jQuery.extend(true, defaultOptions, opts);
    var fuse = new Fuse(list, options);
    return fuse.search(text);
};
