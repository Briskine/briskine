// Truncate and end with ...
gApp.filter('truncate', function () {
    return function (text, length, end) {
        if (!text) {
            return '';
        }

        if (isNaN(length)) {
            length = 100;
        }

        if (end === undefined) {
            end = "...";
        }

        if (text.length <= length || text.length - end.length <= length) {
            return text;
        } else {
            return String(text).substring(0, length - end.length) + end;
        }
    };
});

// replace \n by <br />
gApp.filter('newlines', function () {
    return function (text) {
        return text.replace("\n", "<br />");
    };
});

// tell angular that an output is safe
gApp.filter('safe', function ($sce) {
    return function (val) {
        return $sce.trustAsHtml(val);
    };
});

gApp.filter('stripHTML', function ($sce) {
    return function (html) {
        try {
            var doc = document.implementation.createHTMLDocument();
            var body = doc.createElement('div');
            body.innerHTML = html;
            return body.textContent || body.innerText;
        } catch (e) {
            return "";
        }
    };
});

gApp.filter('gravatar', function () {
    var cache = {};
    return function (text, defaultText) {
        if (!text) {
            return '';
        }

        if (!cache[text]) {
            defaultText = (defaultText) ? md5(defaultText.toString().toLowerCase()) : '';
            cache[text] = (text) ? md5(text.toString().toLowerCase()) : defaultText;
        }
        return 'https://www.gravatar.com/avatar/' + cache[text] + '?d=retro';
    };
});

// Filter templates by tags
gApp.filter('tagFilter', function (TemplateService) {
    return function (templates, filterTags) {
        if (filterTags && filterTags.length) {
            return _.filter(templates, function (t) {
                tags = TemplateService.tags(t);
                return _.intersection(filterTags, tags).length === filterTags.length;
            });
        } else {
            return templates;
        }
    };
});

// Filter templates by sharing setting
gApp.filter('sharingFilter', function () {
    return function (templates, sharing_setting) {
        if (sharing_setting === 'all' || sharing_setting === 'tag') {
            return templates;
        }

        var privateSetting = sharing_setting === 'private';
        return _.filter(templates, function (t) {
            if (privateSetting) { // show only private templates
                return t.private;
            } else { // only shared templates
                return !t.private;
            }
        });
    };
});


gApp.filter('fuzzy', function () {
    return function (list, text, options) {
        if (!text) {
            return list;
        }
        return fuzzySearch(list, text, options);
    };
});
