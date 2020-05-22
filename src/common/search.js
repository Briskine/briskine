import Fuse from 'fuse.js';

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

export function parseSearchString (searchString = '') {
    const tokens = searchString.toLowerCase().split(' ');
    const filters = [];
    const fuzzyTokens = [];

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const fieldTokens = token.split(':');

        if (fieldTokens.length > 1) {
            const field = fieldAlias(fieldTokens[0]);
            let value = fieldTokens[1];

            // value could be after space.
            // if value is not after space,
            // or next value is advanced search operator,
            // we add current token to the search string later.
            const nextValue = tokens[i + 1];
            if (!value && nextValue && !nextValue.includes(':')) {
                value = nextValue;
                // skip value token
                i++;
            }

            if (value) {
                filters.push({
                    field: field,
                    value: value
                });

                continue;
            }
        }

        fuzzyTokens.push(token);
    }

    const text = fuzzyTokens.join(' ');

    return {
        filters: filters,
        text: text
    };
}

export function parseSearchStringNg (searchString = '') {
    const filters = [];
    const fuzzyTokens = [];

    let value = '';
    let filter = {};
    for (let i = 0; i < searchString.length; i++) {
        const token = searchString[i];
        if (token === ':') {
            // value so far was field
            filter.field = fieldAlias(value);
            value = '';

            continue;
        } else if (token === ' ') {
            // when not in double-quote string
            if (value && !value.startsWith('"')) {
                if (filter.field) {
                    filters.push(Object.assign({
                        value: value.trim()
                    }, filter));
                    filter = {};
                } else {
                    fuzzyTokens.push(value.trim());
                }

                value = '';
                continue;
            }
        } else if (token === '"') {
            // double quote strings for filter values.
            // if we have a filter in progress
            if (filter.field) {
                // if we have a value, we reached the the ending quote
                if (value) {
                    filters.push(Object.assign({
                        // remove first quote character
                        value: value.substring(1)
                    }, filter));
                    filter = {};
                    value = '';

                    continue;
                }
            }
        }

        value += token;
    }

    // handle leftover value when end of string reached
    if (value) {
        if (filter.field) {
            filter.value = value.trim();
            filters.push(filter);
        } else {
            fuzzyTokens.push(value.trim());
        }
    }

    const text = fuzzyTokens.join(' ');

    return {
        filters: filters,
        text: text
    };
}

export default function search (list = [], text = '') {
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

    const options = {
        useExtendedSearch: true,
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

    var fuse = new Fuse(filteredList, options);
    return fuse.search(advancedSearch.text).map((result) => {
        return result.item;
    });
}
