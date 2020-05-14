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
