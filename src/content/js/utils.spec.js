import {expect} from 'chai';

import {parseTemplate} from './utils';

describe('parseTemplate', () => {
    it('should parse template without variables', () => {
        expect(parseTemplate('Hello\nBriskine')).to.equal('Hello\nBriskine');
    });

    it('should parse template with undefined variable', () => {
        expect(parseTemplate('Hello {{to.first_name}}')).to.equal('Hello ');
    });

    it('should parse template with variable', () => {
        expect(parseTemplate('Hello {{to.first_name}}', {to: {first_name: 'Briskine'}})).to.equal('Hello Briskine');
    });
});
