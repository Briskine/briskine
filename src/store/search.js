import Fuse from 'fuse.js'

function lowerCase (string = '') {
  return string.toLowerCase()
}

const alias = {
  'in': 'tag'
}

function fieldAlias (field = '') {
  return alias[field] || field
}

const operations = {
  tag: function (filter, item) {
    const tags = (item.tags || []).map((t) => lowerCase(t.trim()))
    return tags.includes(lowerCase(filter.value))
  },
  generic: function (filter, item) {
    // only compare string properties
    if (typeof item[filter.field] === 'string') {
      return lowerCase(item[filter.field]) === lowerCase(filter.value)
    }
    return false
  }
}

function filterOperation (filter = {}, item = {}) {
  if (operations[filter.field]) {
    return operations[filter.field](filter, item)
  }

  return operations.generic(filter, item)
}

export function parseSearchString (searchString = '') {
  const filters = []
  const fuzzyTokens = []

  let value = ''
  let filter = {}
  for (let i = 0; i < searchString.length; i++) {
    const token = searchString[i]
    if (token === ':') {
      // value so far was field
      filter.field = fieldAlias(value)
      value = ''

      continue
    } else if (token === ' ') {
      // when not in double-quote string
      if (value && !value.startsWith('"')) {
        if (filter.field) {
          filters.push(Object.assign({
            value: value.trim()
          }, filter))
          filter = {}
        } else {
          fuzzyTokens.push(value.trim())
        }

        value = ''
        continue
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
          }, filter))
          filter = {}
          value = ''

          continue
        }
      }
    }

    value += token
  }

  // handle leftover value when end of string reached
  if (value) {
    if (filter.field) {
      filter.value = value.trim()
      filters.push(filter)
    } else {
      fuzzyTokens.push(value.trim())
    }
  }

  const text = fuzzyTokens.join(' ')

  return {
    filters: filters,
    text: text
  }
}

export default function search (list = [], searchList = [], text = '') {
  const advancedSearch = parseSearchString(text)
  let filteredList = searchList.slice()

  advancedSearch.filters.forEach((filter) => {
    filteredList = filteredList.filter((item) => {
      return filterOperation(filter, item)
    })
  })

  if (!advancedSearch.text) {
    return filteredList.map((item) => {
      return list.find((l) => l.id === item.id)
    })
  }

  const options = {
    useExtendedSearch: true,
    ignoreLocation: true,
    threshold: 0.3,
    keys: [
      {
        name: 'shortcut',
        weight: 4
      },
      {
        name: 'title',
        weight: 3
      },
      {
        name: 'body',
        weight: 2
      },
      {
        name: 'tags',
        weight: 1
      },
    ]
  }

  var fuse = new Fuse(filteredList, options)
  return fuse.search(advancedSearch.text).map((result) => {
    return list.find((l) => l.id === result.item.id)
  })
}
