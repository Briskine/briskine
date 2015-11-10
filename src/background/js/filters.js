// Truncate and end with ...
gApp.filter('truncate', function () {
    return function (text, length, end) {
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
            var doc = document.implementation.createDocument('http://www.w3.org/1999/xhtml', 'html', null);
            var body = document.createElementNS('http://www.w3.org/1999/xhtml', 'body');
            html = html.replace(/\<br\>/g, '<br />');
            doc.documentElement.innerHTML = html;
            return doc.documentElement.textContent||doc.documentElement.innerText;
        } catch(e) {
            console.error(e);
            return "";
        }
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
