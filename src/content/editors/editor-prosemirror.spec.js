import {expect} from 'chai';

import {parseProseMirrorContent} from './editor-prosemirror.js';

describe('editor ProseMirror', () => {
  it('should add brs after block nodes', () => {
    expect(parseProseMirrorContent('<div>one</div><div>two</div>')).to.equal('<div>one</div><br><div>two</div>')
  })

  it('should add brs only if the block node has a next sibling', () => {
    expect(parseProseMirrorContent('<div>one<div>two</div></div>')).to.equal('<div>one<div>two</div></div>')
  })

  it('should trim collapsed whitespace', () => {
    expect(parseProseMirrorContent('<div>    one    </div>')).to.equal('<div>one</div>')
  })

  it('should keep inline whitespace', () => {
    expect(parseProseMirrorContent('<div>one <strong>two</strong> three</div>')).to.equal('<div>one <strong>two</strong> three</div>')
  })

  it('should keep whitespace inside inline nodes', () => {
    expect(parseProseMirrorContent('<div>one<strong> two </strong>three</div>')).to.equal('<div>one<strong> two </strong>three</div>')
  })

  it('should collapse consecutive whitespace to a single whitespace', () => {
    expect(parseProseMirrorContent('<div>one    <strong>two</strong</div>')).to.equal('<div>one <strong>two</strong></div>')
  })

  it('should remove whitespace-only blocks and newlines', () => {
    expect(parseProseMirrorContent(`
      <div>one</div>
      <div>two</div>
    `)).to.equal('<div>one</div><br><div>two</div>')
  })
})

