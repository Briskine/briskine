import moment from 'moment/min/moment-with-locales.js'

import toText from '../utils/to-text.js'

export default function helperMoment (dateParam, options) {
  // a value that renders as text, like the css helper's matches, can be a date
  const dateText = toText(dateParam)

  // check if str is a valid date
  let dateString
  if (dateText && moment(dateText).isValid()) {
    dateString = dateText
  }
  const date = moment(dateString)

  let opts = {}
  // without text of its own, the first argument is the options hash
  if (!dateText && typeof dateParam === 'object') {
    opts = dateParam
  } else if (typeof options === 'object') {
    opts = options
  }

  // get the default locale from the browser
  let defaultLocale = 'en'
  if (typeof navigator !== 'undefined') {
      defaultLocale = navigator.language
  }

  opts = Object.assign(
    {
      locale: defaultLocale,
      format: 'MMMM DD YYYY'
    },
    opts.hash,
  )

  date.locale(opts.locale)

  let display = 'format'
  let displayParams = []
  const displayMethods = [
    'format',
    'fromNow',
    'toNow',
    'daysInMonth',
    'week',
    'weeks',
  ]

  for (const key in opts) {
    // handle only last display method
    if (displayMethods.includes(key)) {
      display = key
      if (opts[key] !== '') {
        displayParams = [opts[key]]
      } else {
        displayParams = []
      }
      continue
    }

    // only supported methods
    if (
      typeof date[key] === 'function' &&
      !displayMethods.includes(key)
    ) {
      // support multiple function params with ;
      const params = typeof opts[key] === 'string' ? opts[key].split(';').map((s) => s.trim()) : [opts[key]]

      date[key].apply(date, params)
    }
  }

  return date[display].apply(date, displayParams)
}
