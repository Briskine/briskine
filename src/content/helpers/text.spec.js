/* globals describe, it */
import {expect} from 'chai'

import {compileTemplate} from '../sandbox/sandbox.js'

describe('text handlebars helper', () => {
  // split
  it('should split text and render each item', () => {
    expect(compileTemplate('{{#each (text "john@briskine.com" "split" "@")}}{{.}}\n{{/each}}')).to.equal('john\nbriskine.com\n')
  })
  it('should split text and render first item', () => {
    expect(compileTemplate('{{lookup (text "john@briskine.com" "split" "@") 0}}')).to.equal('john')
  })
  it('should split text and render second item', () => {
    expect(compileTemplate('{{lookup (text "john@briskine.com" "split" "@") 1}}')).to.equal('briskine.com')
  })
  it('should split text with subexpression and render second item', () => {
    expect(compileTemplate('{{lookup (text "john@briskine.com" "split" "@") 1}}')).to.equal('briskine.com')
  })

  // replace
  it('should replace character first occurrence in text', () => {
    expect(compileTemplate('{{text "john@brisk@ne.com" "replace" "@" "%"}}')).to.equal('john%brisk@ne.com')
  })

  // replaceAll
  it('should replace all character occurrences in text', () => {
    expect(compileTemplate('{{text "john@brisk@ne.com" "replaceAll" "@" "%"}}')).to.equal('john%brisk%ne.com')
  })

  // startsWith
  it('should print conditional startsWith subexpression', () => {
    expect(compileTemplate('{{#if (text "john@brisk@ne.com" "startsWith" "john")}}Hello John{{/if}}')).to.equal('Hello John')
  })

  // replicate the legacy domain helper with text
  it('should print prettified domain name', () => {
    expect(compileTemplate(`
      {{~capitalizeAll (text (text (lookup (text (lookup (text "contact@AWESOME-sweet-bakery.co.uk" "split" "@") 1) "split" ".") 0) "replaceAll" "-" " ") "toLowerCase")~}}
    `)).to.equal('Awesome Sweet Bakery')
  })
})
