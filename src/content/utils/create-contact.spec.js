/* globals describe, it */
import {expect} from 'chai'

import createContact from './create-contact.js'

describe('createContact', () => {
  it('should create contact from undefined', () => {
    expect(createContact()).to.deep.equal({
      email: '',
      name: '',
      first_name: '',
      last_name: '',
    })
  })

  it('should create contact from name only', () => {
    expect(createContact({name: 'First Last'})).to.deep.equal({
      email: '',
      name: 'First Last',
      first_name: 'First',
      last_name: 'Last',
    })
  })

  it('should create contact from name with comma', () => {
    expect(createContact({name: 'Last, First'})).to.deep.equal({
      email: '',
      name: 'First Last',
      first_name: 'First',
      last_name: 'Last',
    })
  })

  it('should create contact from first name only', () => {
    expect(createContact({name: 'First'})).to.deep.equal({
      email: '',
      name: 'First',
      first_name: 'First',
      last_name: '',
    })
  })

  it('should create contact from three word name', () => {
    expect(createContact({name: 'First Second Third'})).to.deep.equal({
      email: '',
      name: 'First Second Third',
      first_name: 'First',
      last_name: 'Second Third',
    })
  })

  it('should create contact from three word name with comma', () => {
    expect(createContact({name: 'Last, First Second'})).to.deep.equal({
      email: '',
      name: 'First Second Last',
      first_name: 'First Second',
      last_name: 'Last',
    })
  })

  it('should create contact from complete object', () => {
    const contact = {
      email: 'email',
      name: 'First Last',
      first_name: 'First1',
      last_name: 'Last1',
    }
    expect(createContact(contact)).to.deep.equal({
      email: 'email',
      name: 'First Last',
      first_name: 'First',
      last_name: 'Last',
    })
  })

  it('should create contact from object with extra properties', () => {
    const contact = {
      email: 'email',
      name: 'First Last',
      unsupported_property: 'unsupported',
    }
    expect(createContact(contact)).to.deep.equal({
      email: 'email',
      name: 'First Last',
      first_name: 'First',
      last_name: 'Last'
    })
  })

  it('should create contact from email and full name', () => {
    expect(createContact({email: 'email', name: 'First Last'})).to.deep.equal({
      email: 'email',
      name: 'First Last',
      first_name: 'First',
      last_name: 'Last'
    })
  })

  it('should create contact from full name with suffix', () => {
    expect(createContact({name: 'First Last, PhD'})).to.deep.equal({
      email: '',
      name: 'First Last',
      first_name: 'First',
      last_name: 'Last'
    })
  })

  it('should create contact from full name with non standard suffix', () => {
    expect(createContact({name: 'First Last, Ph.D'})).to.deep.equal({
      email: '',
      name: 'First Last',
      first_name: 'First',
      last_name: 'Last'
    })
  })

  it('should create contact from full name with suffix and wrong space', () => {
    expect(createContact({name: 'First Last ,Ph.D'})).to.deep.equal({
      email: '',
      name: 'First Last',
      first_name: 'First',
      last_name: 'Last'
    })
  })

  it('should create contact from full name with multiple suffixes', () => {
    expect(createContact({name: 'First Last, PhD, SLP'})).to.deep.equal({
      email: '',
      name: 'First Last',
      first_name: 'First',
      last_name: 'Last'
    })
  })
})
