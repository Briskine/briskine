import {expect} from 'chai';

import {parseSearchString, parseSearchStringNg} from './search';

const s1 = 'text';
const s2 = 'field:value';
const s3 = 'field: value';
const s4 = 'field:value text1 text2';
const s5 = 'text1 text2 field1:value1';
const s6 = 'field1:"value value1" text1 text2 text14"text3 text4';
const s7 = 'field:value1 text test2:"dsfsdfsd sdsdfdsf"';

describe('parseSearchString', function() {
    it('should return -1 when the value is not present', function() {
        expect(parseSearchString(s1)).to.deep.equal(parseSearchStringNg(s1));
        expect(parseSearchString(s2)).to.deep.equal(parseSearchStringNg(s2));
        expect(parseSearchString(s3)).to.deep.equal(parseSearchStringNg(s3));
        expect(parseSearchString(s4)).to.deep.equal(parseSearchStringNg(s4));
        expect(parseSearchString(s5)).to.deep.equal(parseSearchStringNg(s5));
        expect(parseSearchString(s6)).to.deep.equal(parseSearchStringNg(s6));
        expect(parseSearchString(s7)).to.deep.equal(parseSearchStringNg(s7));
    });
});
