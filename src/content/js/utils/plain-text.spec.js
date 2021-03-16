import {expect} from 'chai';

import {htmlToText} from './plain-text';

describe('htmlToText', () => {
    it('should convert html to text', () => {
        expect(htmlToText('<div>first-line<div>second-line</div></div>')).equal('first-line\nsecond-line');
    });

    it('should keep plain text links intact', () => {
        expect(htmlToText('https://www.gorgiastemplates.com/')).equal('https://www.gorgiastemplates.com/');
    });
});
