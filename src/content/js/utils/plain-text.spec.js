import {expect} from 'chai';

import {htmlToText} from './plain-text';

describe('htmlToText', () => {
    it('should convert html to text', () => {
        expect(htmlToText('<div>first-line<div>second-line</div></div>')).equal('first-line\nsecond-line');
    });

    it('should keep plain text links intact', () => {
        expect(htmlToText('https://www.gorgiastemplates.com/')).equal('https://www.gorgiastemplates.com/');
    });

    it('should keep plain text the same', () => {
        const content = 'line-one\n* bullet\nlink(https://gorgiastemplates.com';
        expect(htmlToText(content)).equal(content);
    });

    it('should decorate lists', () => {
        expect(htmlToText('<ul><li>one</li><li>two</li</ul>')).equal('- one\n- two');
    });

    it('should decorate links', () => {
        expect(htmlToText('<a href="https://gorgiastemplates.com/">gorgiastemplates</a>')).equal('gorgiastemplates (https://gorgiastemplates.com/)');
    });

    it('should decorate links only with different urls', () => {
        expect(htmlToText('<a href="https://gorgiastemplates.com/">https://gorgiastemplates.com/</a>')).equal('https://gorgiastemplates.com/');
    });

    it('should decorate images', () => {
        expect(htmlToText('<img src="https://gorgiastemplates.com/image.jpg" alt="image alt">')).equal('[image alt https://gorgiastemplates.com/image.jpg]');
    });

    it('should keep code blocks as code', () => {
        const code = '<div></div><div><textarea></textarea></div>';
        expect(htmlToText(`<code>${code}</code>`)).equal(code);
    });

});
