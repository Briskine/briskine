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

// Filter quicktexts by tags
gApp.filter('tagFilter', function (QuicktextService) {
    return function (quicktexts, filterTags) {
        if (filterTags && filterTags.length) {
            return _.filter(quicktexts, function (qt) {
                tags = QuicktextService.tags(qt);
                return _.intersection(filterTags, tags).length === filterTags.length;
            });
        } else {
            return quicktexts;
        }
    };
});
