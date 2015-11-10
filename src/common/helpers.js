//  format an ISO date using Moment.js
//  http://momentjs.com/
//  moment syntax example: moment(Date("2011-07-18T15:50:52")).format("MMMM YYYY")
//  usage: {{dateFormat creation_date format="MMMM YYYY"}}
Handlebars.registerHelper('dateFormat', function (context, block) {
    if (window.moment) {
        var f = block.hash.format || "MMM DD, YYYY hh:mm:ss A";
        return moment(context).format(f); //had to remove Date(context)
    } else {
        return context;   //  moment plugin not available. return data as is.
    }
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

var PrepareVars = function (vars) {
    var prep = function (data) {
        // convert array to object
        var data = _.extend({}, data);
        var flat = data[0];
        for (var i in flat) {
            data[i] = flat[i];
        }
        return data;
    };

    if (vars.to.length) {
        vars.to = prep(vars.to);
    }
    if (vars.from.length) {
        vars.from = prep(vars.from);
    }
    if (vars.cc.length) {
        vars.cc = prep(vars.cc);
    }
    if (vars.bcc.length) {
        vars.bcc = prep(vars.bcc);
    }
    return vars;
};
