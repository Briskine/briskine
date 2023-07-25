import Handlebars from 'handlebars';
import moment from 'moment';

function momentHelper(str, options) {
    // check if str is a valid date
    let dateString;
    if (typeof str === 'string' && moment(str).isValid()) {
        dateString = str;
    }
    const date = moment(dateString);

    let opts = {};
    if (typeof str === 'object') {
        opts = str;
    } else if (typeof options === 'object') {
        opts = options;
    }

    // get the default locale from the browser
    const defaultLocale = navigator.language || 'en'
    opts = Object.assign(
        {
            locale: defaultLocale,
            format: 'MMMM DD YYYY'
        },
        opts.hash
    );

    date.locale(opts.locale);

    let display = 'format';
    let displayParams = [];
    const displayMethods = [
        'format',
        'fromNow',
        'toNow',
        'daysInMonth',
        'week',
        'weeks',
    ];

    for (const key in opts) {
        // handle only last display method
        if (displayMethods.includes(key)) {
            display = key;
            if (opts[key] !== '') {
              displayParams = [opts[key]]
            } else {
              displayParams = []
            }
            continue;
        }

        // only supported methods
        if (
            typeof date[key] === 'function' &&
            !displayMethods.includes(key)
        ) {
            // support multiple function params with ;
            const params = typeof opts[key] === 'string' ?
                opts[key].split(';').map((s) => s.trim()) :
                [opts[key]];

            date[key].apply(date, params);
        }
    }

    return date[display].apply(date, displayParams);
}

Handlebars.registerHelper('moment', momentHelper);
