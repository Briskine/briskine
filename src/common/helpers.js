import $ from 'jquery';
import Fuse from 'fuse.js';
import _ from 'underscore';

// fuzzy search with fuse.js
export function fuzzySearch (list, text, opts) {
    if (!text) {
        return list;
    }

    if (opts.threshold === 0) {
        return _.filter(list, function (i) {
            if (i.shortcut && i.shortcut.indexOf(text) !== -1) {
                return true;
            }
            if (i.title && i.title.indexOf(text) !== -1) {
                return true;
            }
            if (i.body && i.body.indexOf(text) !== -1) {
                return true;
            }
            return false;
        });
    }

    var defaultOptions = {
        keys: [
            {
                name: 'shortcut',
                weight: 0.4
            },
            {
                name: 'title',
                weight: 0.4
            },
            {
                name: 'body',
                weight: 0.2
            }
        ]
    };

    var options = $.extend(true, defaultOptions, opts);
    var fuse = new Fuse(list, options);
    return fuse.search(text).map((result) => {
        return result.item;
    });
}
