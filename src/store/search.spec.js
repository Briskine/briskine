/* globals describe, it */
import {expect} from 'chai';

import {parseSearchString} from './search.js';

describe('parseSearchString', () => {
    it('should only parse text', () => {
        expect(parseSearchString('pizza')).to.deep.equal({
            filters: [],
            text: 'pizza'
        });
    });

    it('should parse filter with value', () => {
        expect(parseSearchString('pizza:pepperoni')).to.deep.equal({
            filters: [{ field: 'pizza', value: 'pepperoni' }],
            text: ''
        });
    });

    it('should parse filter with space before value', () => {
        expect(parseSearchString('pizza: pepperoni')).to.deep.equal({
            filters: [{ field: 'pizza', value: 'pepperoni' }],
            text: ''
        });
    });

    it('should parse filter and text', () => {
        expect(parseSearchString('pizza:pepperoni california')).to.deep.equal({
            filters: [{ field: 'pizza', value: 'pepperoni' }],
            text: 'california'
        });
    });

    it('should parse text and filter at the end', () => {
        expect(parseSearchString('california chicago pizza:pepperoni')).to.deep.equal({
            filters: [{ field: 'pizza', value: 'pepperoni' }],
            text: 'california chicago'
        });
    });

    it('should parse text and filter value in quotes', () => {
        expect(parseSearchString('california pizza:"california chicago"')).to.deep.equal({
            filters: [{ field: 'pizza', value: 'california chicago' }],
            text: 'california'
        });
    });

    it('should parse text and filter value with unclosed quotes', () => {
        expect(parseSearchString('california pizza:"california chicago')).to.deep.equal({
            filters: [{ field: 'pizza', value: '"california chicago' }],
            text: 'california'
        });
    });
});
