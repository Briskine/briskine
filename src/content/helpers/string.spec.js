/* globals describe, it */
import {expect} from 'chai'

import {compileTemplate} from '../sandbox/sandbox.js'

describe('string handlebars helper', () => {
  // split
  it('should split string and render each item', () => {
    expect(compileTemplate('{{#each (string "john@briskine.com" "split" "@")}}{{.}}\n{{/each}}')).to.equal('john\nbriskine.com\n')
  })
  it('should split string and render first item', () => {
    expect(compileTemplate('{{lookup (string "john@briskine.com" "split" "@") 0}}')).to.equal('john')
  })
  it('should split string and render second item', () => {
    expect(compileTemplate('{{lookup (string "john@briskine.com" "split" "@") 1}}')).to.equal('briskine.com')
  })
  it('should split string with subexpression and render second item', () => {
    expect(compileTemplate('{{lookup (string "john@briskine.com" "split" "@") 1}}')).to.equal('briskine.com')
  })

  // replace
  it('should replace character first occurrence in string', () => {
    expect(compileTemplate('{{string "john@brisk@ne.com" "replace" "@" "%"}}')).to.equal('john%brisk@ne.com')
  })

  // replaceAll
  it('should replace all character occurrences in string', () => {
    expect(compileTemplate('{{string "john@brisk@ne.com" "replaceAll" "@" "%"}}')).to.equal('john%brisk%ne.com')
  })

  // startsWith
  it('should print conditional startsWith subexpression', () => {
    expect(compileTemplate('{{#if (string "john@brisk@ne.com" "startsWith" "john")}}Hello John{{/if}}')).to.equal('Hello John')
  })

  // replicate the legacy domain helper with string
  it('should print prettified domain name', () => {
    expect(compileTemplate(`
      {{~capitalizeAll (string (string (lookup (string (lookup (string "contact@AWESOME-sweet-bakery.co.uk" "split" "@") 1) "split" ".") 0) "replaceAll" "-" " ") "toLowerCase")~}}
    `)).to.equal('Awesome Sweet Bakery')
  })
})
