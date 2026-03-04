import { expect, describe, it, vi, beforeEach, afterEach } from 'vitest'

import MockDate from 'mockdate'

import {compileTemplate} from '../sandbox/sandbox.js'

MockDate.set('2020-07-01')

describe('moment handlebars helper', () => {
  beforeEach(() => {
    const spy = vi.spyOn(navigator, 'language', 'get')
    spy.mockImplementationOnce(() => 'en-US')
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should default format date', async () => {
    expect(await compileTemplate('{{moment}}')).to.equal('July 01 2020')
  })

  it('should custom format date', async () => {
    expect(await compileTemplate('{{moment format="YYYY"}}')).to.equal('2020')
  })

  it('should default format custom date value', async () => {
    expect(await compileTemplate('{{moment "2020-01-01"}}')).to.equal('January 01 2020')
  })

  it('should custom format date value', async () => {
    expect(await compileTemplate('{{moment "2020-01-01" format="MMMM"}}')).to.equal('January')
  })

  it('should show next day of the week', async () => {
    expect(await compileTemplate('{{moment add="1;days" format="dddd"}}')).to.equal('Thursday')
  })

  it('should show previous day of the week', async () => {
    expect(await compileTemplate('{{moment subtract="1;days" format="dddd"}}')).to.equal('Tuesday')
  })

  it('should show next day of the week in French', async () => {
    expect(await compileTemplate('{{moment add="1;days" format="dddd" locale="fr"}}')).to.equal('jeudi')
  })

  it('should show next day in Japanese', async () => {
    expect(await compileTemplate('{{moment add="1;days" format="YYYY年 MMM Do (dddd)" locale="ja"}}')).to.equal('2020年 7月 2日 (木曜日)')
  })

  it('should show end of week', async () => {
    expect(await compileTemplate('{{moment endOf="week"}}')).to.equal('July 04 2020')
  })

  it('should show time from now', async () => {
    expect(await compileTemplate('{{moment "2020-07-10" fromNow=""}}')).to.equal('in 9 days')
  })

  it('should show time to now', async () => {
    expect(await compileTemplate('{{moment "2020-07-10" toNow=""}}')).to.equal('9 days ago')
  })

  it('should show days in month', async () => {
    expect(await compileTemplate('{{moment daysInMonth=""}}')).to.equal('31')
  })

  it('should show the week number', async () => {
    expect(await compileTemplate('{{moment week=""}}')).to.equal('27')
    expect(await compileTemplate('{{moment weeks=""}}')).to.equal('27')
  })

  it('should use default browser locale', async () => {
    vi.resetAllMocks()
    const spy = vi.spyOn(navigator, 'language', 'get')
    spy.mockImplementationOnce(() => 'ja')

    expect(await compileTemplate('{{moment}}')).to.equal('7月 01 2020')
  })

  it('should set hour', async () => {
    expect(await compileTemplate('{{moment hour=11 format="LT"}}')).to.equal('11:00 AM')
  })

  it('should set minutes', async () => {
    expect(await compileTemplate('{{moment minutes=29 format="LT"}}')).to.equal('3:29 AM')
  })
})
