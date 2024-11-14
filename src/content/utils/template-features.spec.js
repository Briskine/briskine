/* globals describe, it */
import {expect} from 'chai'

import templateFeatures from './template-features.js'

describe.only('templateFeatures', () => {
  it('should not find partials or account', () => {
    const template = `
      <div>
        {{ from.first_name }}
      </div>
      {{#each}}variable={{variable}}{{/each}}
    `
    expect(templateFeatures(template)).to.not.include({partials: true, account: true})
  })

  it('should find partials', () => {
    const template = `
      {{> partial }}
    `
    expect(templateFeatures(template)).to.include({partials: true})
  })

  it('should find account expression', () => {
    const template = `
      {{ account }}
    `
    expect(templateFeatures(template)).to.include({account: true})
  })

  it('should find account expression with nested property', () => {
    const template = `
      {{ account.first_name }}
    `
    expect(templateFeatures(template)).to.include({account: true})
  })

  it('should find account expression in conditional', () => {
    const template = `
      {{#if test}}
        {{account.last_name}}
      {{/if}}
    `
    expect(templateFeatures(template)).to.include({account: true})
  })

  it('should find account expression in inline helper', () => {
    const template = `
      {{inline_helper account.last_name}}
    `
    expect(templateFeatures(template)).to.include({account: true})
  })

  it('should find account expression in complex template', () => {
    const template = `
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
    `
    expect(templateFeatures(template)).to.include({account: true})
  })


  it('should find account expression and partials', () => {
    const template = `
      {{> partial}}
      {{#if test}}
        {{account.last_name}}
      {{/if}}
      <footer />
    `
    expect(templateFeatures(template)).to.include({account: true, partials: true})
  })
})
