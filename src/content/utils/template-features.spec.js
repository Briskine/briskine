/* globals describe, it */
import {expect} from 'chai'
import {parse} from 'handlebars'

import templateFeatures from './template-features.js'

describe('templateFeatures', () => {
  it('should not find any features', () => {
    const template = parse(`
      <div>
        {{ to.first_name }}
      </div>
      {{#each}}variable={{variable}}{{/each}}
    `)
    expect(templateFeatures(template)).to.deep.equal({
      partials: false,
      account: false,
      from: false,
    })
  })

  it('should find partials', () => {
    const template = parse(`
      {{> partial }}
    `)
    expect(templateFeatures(template)).to.include({partials: true})
  })

  it('should find account expression', () => {
    const template = parse(`
      {{ account }}
    `)
    expect(templateFeatures(template)).to.include({account: true})
  })

  it('should find account expression with nested property', () => {
    const template = parse(`
      {{ account.first_name }}
    `)
    expect(templateFeatures(template)).to.include({account: true})
  })

  it('should find account expression in conditional', () => {
    const template = parse(`
      {{#if test}}
        {{account.last_name}}
      {{/if}}
    `)
    expect(templateFeatures(template)).to.include({account: true})
  })

  it('should find account expression in inline helper', () => {
    const template = parse(`
      {{inline_helper account.last_name}}
    `)
    expect(templateFeatures(template)).to.include({account: true})
  })

  it('should find account expression in complex template', () => {
    const template = parse(`
      <header>
        {{#if test}}
          <h1>
          {{#each variable}}
            {{#block_helper}}
              {{inline_helper account.last_name}}
            {{/block_helper}}
          {{/each}}
          </h1>
        {{/if}}
      </header>
    `)
    expect(templateFeatures(template)).to.include({account: true})
  })


  it('should find account expression and partials', () => {
    const template = parse(`
      {{> partial}}
      {{#if test}}
        {{account.last_name}}
      {{/if}}
      <footer />
    `)
    expect(templateFeatures(template)).to.include({account: true, partials: true})
  })

  it('should find from expression with nested property', () => {
    const template = parse(`
      {{ from.first_name }}
    `)
    expect(templateFeatures(template)).to.include({from: true})
  })
})
