// Legacy date helper,
// will be deprecated in the future.
import moment from 'moment'

//  format a date using Moment.js
//  http://momentjs.com/
//  moment syntax example: moment(Date("2011-07-18T15:50:52")).format("MMMM YYYY")
//  usage: {{date '+7' 'days' "DD MMMM"}} -> 13 December
//  usage: {{date '-7' 'days' "DD MMMM YYYY"}} -> 29 November 2015
export default function (literal, unit, format) {
  format = typeof(format) === 'string' ? format : 'YYYY-MM-DD'
  unit = typeof(unit) === 'string' ? unit : 'days'

  if (typeof literal === 'string') {
    literal = parseInt(literal, 10)
  } else if (typeof literal !== 'number') {
    throw Error('Date literal ' + literal + ' should be string or number')
  }

  return moment().add(literal, unit).format(format)
}
