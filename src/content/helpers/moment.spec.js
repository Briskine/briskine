import {expect} from 'chai'
import Handlebars from 'handlebars'
import MockDate from 'mockdate'

import './moment.js'

MockDate.set('2020-07-01')

function parseTemplate (template = '', data = {}) {
  return Handlebars.compile(template)(data)
}

describe('moment handlebars helper', () => {
  it('should default format date', () => {
    expect(parseTemplate('{{moment}}')).to.equal('July 01 2020')
  })

  it('should custom format date', () => {
    expect(parseTemplate('{{moment format="YYYY"}}')).to.equal('2020')
  })

  it('should default format custom date value', () => {
    expect(parseTemplate('{{moment "2020-01-01"}}')).to.equal('January 01 2020')
  })

  it('should custom format date value', () => {
    expect(parseTemplate('{{moment "2020-01-01" format="MMMM"}}')).to.equal('January')
  })

  it('should show next day of the week', () => {
    expect(parseTemplate('{{moment add="1;days" format="dddd"}}')).to.equal('Thursday')
  })

  it('should show previous day of the week', () => {
    expect(parseTemplate('{{moment subtract="1;days" format="dddd"}}')).to.equal('Tuesday')
  })

  it('should show next day of the week in French', () => {
    expect(parseTemplate('{{moment add="1;days" format="dddd" locale="fr"}}')).to.equal('jeudi')
  })

  it('should show end of week', () => {
    expect(parseTemplate('{{moment endOf="week"}}')).to.equal('July 04 2020')
  })

  it('should show time from now', () => {
    expect(parseTemplate('{{moment "2020-07-10" fromNow=true}}')).to.equal('9 days')
  })

  it('should show time to now', () => {
    expect(parseTemplate('{{moment "2020-07-10" toNow=""}}')).to.equal('9 days ago')
  })

  it('should show days in month', () => {
    expect(parseTemplate('{{moment daysInMonth=true}}')).to.equal('31')
  })

  it('should use default browser locale', () => {
    // forcefully set navigator.language
    Object.defineProperty(navigator, 'language', {
      get: () => 'ja'
    })

    expect(parseTemplate('{{moment}}')).to.equal('7月 01 2020')
  })
})
