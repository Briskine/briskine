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

  it('should create contact from complete object', () => {
    const contact = {
      email: 'email',
      name: 'First Last',
      first_name: 'First1',
      last_name: 'Last1',
    }
    expect(createContact(contact)).to.deep.equal(contact)
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
})
