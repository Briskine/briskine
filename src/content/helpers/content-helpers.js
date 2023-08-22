import Handlebars from 'handlebars';

// TODO deprecate
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

