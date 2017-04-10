/**
 * Utils
 */

App.utils = (function() {
    // split full name by last space.
    var splitFullName = function (fullname) {
        fullname = fullname || '';

        var lastSpaceIndex = fullname.lastIndexOf(' ');
        if (lastSpaceIndex < 1) {
            lastSpaceIndex = fullname.length;
        }

        return {
            first_name: fullname.substr(0, lastSpaceIndex),
            last_name: fullname.substr(lastSpaceIndex + 1)
        };
    };

    // extracts name and email from google sign-out title string.
    // title = Google Account: User Name (user@email.net)
    var parseUserDetails = function (title) {
        var details = {
            email: '',
            name: ''
        };
        var sep = ':';

        if (title && title.indexOf(sep) !== -1) {
            var prefix = title.split(sep)[0] + sep;
            details.name = title.replace(prefix, '').trim();
        }

        if (details.name) {
            var openBracket = details.name.lastIndexOf('(');
            // in case of no brackets
            if (openBracket === -1) {
                openBracket = details.name.length;
            } else {
                details.email = details.name.substr(openBracket).slice(1, -1);
            }

            details.name = details.name.substr(0, openBracket).trim();
        }

        return jQuery.extend(details, splitFullName(details.name));
    };

    return {
        splitFullName: splitFullName,
        parseUserDetails: parseUserDetails
    };
}());
