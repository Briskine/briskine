/* globals describe, it */
import {expect} from 'chai'
import MockDate from 'mockdate'

import {compileTemplate} from '../sandbox/sandbox.js'

MockDate.set('2020-07-01')

describe('moment handlebars helper', () => {
  it('should default format date', () => {
    expect(compileTemplate('{{moment}}')).to.equal('July 01 2020')
  })

  it('should custom format date', () => {
    expect(compileTemplate('{{moment format="YYYY"}}')).to.equal('2020')
  })

  it('should default format custom date value', () => {
    expect(compileTemplate('{{moment "2020-01-01"}}')).to.equal('January 01 2020')
  })

  it('should custom format date value', () => {
    expect(compileTemplate('{{moment "2020-01-01" format="MMMM"}}')).to.equal('January')
  })

  it('should show next day of the week', () => {
    expect(compileTemplate('{{moment add="1;days" format="dddd"}}')).to.equal('Thursday')
  })

  it('should show previous day of the week', () => {
    expect(compileTemplate('{{moment subtract="1;days" format="dddd"}}')).to.equal('Tuesday')
  })

  it('should show next day of the week in French', () => {
    expect(compileTemplate('{{moment add="1;days" format="dddd" locale="fr"}}')).to.equal('jeudi')
  })

  it('should show end of week', () => {
    expect(compileTemplate('{{moment endOf="week"}}')).to.equal('July 04 2020')
  })

  it('should show time from now', () => {
    expect(compileTemplate('{{moment "2020-07-10" fromNow=""}}')).to.equal('in 9 days')
  })

  it('should show time to now', () => {
    expect(compileTemplate('{{moment "2020-07-10" toNow=""}}')).to.equal('9 days ago')
  })

  it('should show days in month', () => {
    expect(compileTemplate('{{moment daysInMonth=""}}')).to.equal('31')
  })

  it('should show the week number', () => {
    expect(compileTemplate('{{moment week=""}}')).to.equal('27')
    expect(compileTemplate('{{moment weeks=""}}')).to.equal('27')
  })

  it('should use default browser locale', () => {
    // forcefully set navigator.language
    Object.defineProperty(navigator, 'language', {
      get: () => 'ja'
    })

    expect(compileTemplate('{{moment}}')).to.equal('7月 01 2020')
  })
})
