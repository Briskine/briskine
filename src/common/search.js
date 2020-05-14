import $ from 'jquery';
import Fuse from 'fuse.js';
import _ from 'underscore';

function lowerCase (string = '') {
    return string.toLowerCase();
}

const alias = {
    'in': 'tag'
};

function fieldAlias (field = '') {
    return alias[field] || field;
}

const operations = {
    tag: function (filter, item) {
        const tags = (item.tags || '').replace(/ /g, '').split(',');
        return tags.includes(filter.value);
    },
    generic: function (filter, item) {
        return lowerCase(item[filter.field]) === filter.value;
    }
};

function filterOperation (filter = {}, item = {}) {
    if (operations[filter.field]) {
        return operations[filter.field](filter, item);
    }

    return operations.generic(filter, item);
}

function parseSearchString (searchString = '') {
    const tokens = searchString.toLowerCase().split(' ');
    const filters = [];
    const fuzzyTokens = [];

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const fieldTokens = token.split(':');

        if (fieldTokens.length > 1) {
            const field = fieldAlias(fieldTokens[0]);
            let value = fieldTokens[1];

            // value is after space
            if (!value) {
               value = tokens[i + 1];
               // skip value
               i++;
            }

            filters.push({
                field: field,
                value: value
            });
        } else {
            fuzzyTokens.push(token);
        }
    }

    const text = fuzzyTokens.join(' ');

    return {
        filters: filters,
        text: text
    };
}

// TODO remove options
export default function search (list = [], text = '', opts = {}) {
    const advancedSearch = parseSearchString(text);
    let filteredList = list.slice();

    advancedSearch.filters.forEach((filter) => {
        filteredList = filteredList.filter((item) => {
            return filterOperation(filter, item);
        });
    });

    if (!advancedSearch.text) {
        return filteredList;
    }

    // TODO check how we can remove this threshold
    // TODO threshold disables fuzzy search, let's remove it
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

    const defaultOptions = {
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

    // TODO remove jquery
    var options = $.extend(true, defaultOptions, opts);
    var fuse = new Fuse(filteredList, options);
    return fuse.search(advancedSearch.text).map((result) => {
        return result.item;
    });
}
