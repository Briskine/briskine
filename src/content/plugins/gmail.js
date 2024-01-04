/* eslint-disable no-useless-escape */
/* Gmail plugin
 */

import parseTemplate from '../utils/parse-template.js'
import {insertTemplate} from '../editors/editor-universal.js'
import {isContentEditable} from '../editors/editor-contenteditable.js'
import createContact from '../utils/create-contact.js'
import {enableBubble} from '../bubble/bubble.js'
import {addAttachments} from '../attachments/attachments.js'

const fromFieldSelector = '.az2';
const textfieldContainerSelector = '.M9';

var regExString = /"?([^ ]*)\s*(.*)"?\s*[(<]([^>)]+)[>)]/;
var regExEmail = /([\w!.%+\-])+@([\w\-])+(?:\.[\w\-]+)+/;

function parseString (string = '') {
    var match = regExString.exec(string.trim());
    var data = {
        name: '',
        first_name: '',
        last_name: '',
        email: ''
    };

    if (match && match.length >= 4) {
        data.first_name = match[1].replace('"', '').trim();
        data.last_name = match[2].replace('"', '').trim();
        data.name = data.first_name + (data.first_name && data.last_name ? ' ' : '') + data.last_name;
        data.email = match[3];
    } else {
        // try to match the email
        match = regExEmail.exec(string);
        if (match) {
            data.email = match[0];
        }
    }

    return data;
}

// get all required data from the dom
function getData (params) {
    const data = {
        from: [],
        to: [],
        cc: [],
        bcc: [],
        subject: ''
    };

    if (isContentEditable(params.element)) {
        // get the email field from the account details tooltip.
        // the details popup changes the className on each release,
        // so we use the dom structure to find it.
        // get the two-level deep nested div, that contains an @, from the email address.
        // start from the end, because the popup is located near the end of the page,
        // and the main container can also contain email addresses.
        // ignore divs with peoplekit-id, as they show up after adding to/cc/bcc addresses,
        // and are also placed at the end of the body.
        const $email = Array
          .from(document.querySelectorAll('body > div:not([peoplekit-id]) > div > div'))
          .reverse()
          // div containing only text nodes with @
          .find((div) => (div.children.length === 0 && (div.textContent || '').includes('@')))
        const $fullName = $email ? $email.previousElementSibling : null

        const fullNameText = $fullName ? $fullName.innerText : ''
        const emailText = $email ? $email.innerText : ''
        data.from = [ parseString(`${fullNameText} <${emailText}>`) ]

        const $container = params.element.closest(textfieldContainerSelector);
        if ($container) {
            // if we use multiple aliases,
            // get from details from the alias selector at the top of the compose box.
            const $fromSelect = $container.querySelector(fromFieldSelector);
            if ($fromSelect) {
                data.from = [ parseString($fromSelect.innerText) ];
            }

            [ 'to', 'cc', 'bcc' ].forEach((fieldName) => {
                data[fieldName] = Array.from(
                    $container.querySelectorAll(`input[name=${fieldName}], [name=${fieldName}] [role=option]`)
                  ).map((field) => {
                    if (field.value) {
                      return parseString(field.value)
                    }

                    const email = field.getAttribute('data-hovercard-id')
                    if (email) {
                      return createContact({
                        email: email,
                        name: field.getAttribute('data-name')
                      })
                    }

                    return {}
                  })
            });

            const $subjectField = $container.querySelector('input[name=subjectbox]');
            if ($subjectField) {
                data.subject = ($subjectField.value || '').replace(/^Re: /, '');
            }
        }
    }

    return data
}

// from field support for aliases
function setFromField ($textfield, fromEmail = '') {
    // get current compose container,
    // in case we are in reply area.
    const $container = $textfield.closest(textfieldContainerSelector);

    if ($container) {
        const $option = $container.querySelector(`[value="${fromEmail}"][role=menuitem]`);
        if ($option) {
            // select option
            $option.dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));
            // HACK mouseup needs to be triggered twice for the option to be selected
            $option.dispatchEvent(new MouseEvent('mouseup', {bubbles: true}));
            $option.dispatchEvent(new MouseEvent('mouseup', {bubbles: true}));
        }
    }
}

function extraField ($parent, fieldName) {
  if (!parent) {
    return
  }

  return $parent.querySelector(`textarea[name=${fieldName}], [name=${fieldName}] input`)
}

async function after (params, data) {
  const $parent = params.element.closest(textfieldContainerSelector)

  const $subject = $parent.querySelector('input[name=subjectbox]')
  // set subject only when the subject field is visible.
  // makes sure we don't break threads when replying.
  if (
    params.quicktext.subject
    && $subject
    && $subject.getBoundingClientRect().width
  ) {
    const parsedSubject = await parseTemplate(params.quicktext.subject, data)
    $subject.value = parsedSubject
  }

  const $recipients = $parent.querySelector('.aoD.hl')
  if (
    (
      params.quicktext.to ||
      params.quicktext.cc ||
      params.quicktext.bcc
    ) &&
    $recipients
  ) {
    // click the receipients row.
    // a little jumpy,
    // but the only to way to show the new value.
    $recipients.dispatchEvent(new MouseEvent('click', {bubbles: true}))
  }

  if (params.quicktext.to) {
    const parsedTo = await parseTemplate(params.quicktext.to, data)
    const $toField = extraField($parent, 'to')
    if ($toField) {
      $toField.value = parsedTo
      $toField.dispatchEvent(new FocusEvent('blur'))
    }
  }

  const buttonSelectors = {
    cc: '.aB.gQ.pE',
    bcc: '.aB.gQ.pB'
  }

  Array('cc', 'bcc').forEach(async (fieldName) => {
    if (params.quicktext[fieldName]) {
      const parsedField = await parseTemplate(params.quicktext[fieldName], data)
      $parent.querySelector(buttonSelectors[fieldName]).dispatchEvent(new MouseEvent('click', {bubbles: true}))
      const $field = extraField($parent, fieldName)
      if ($field) {
        $field.value = parsedField
        $field.dispatchEvent(new FocusEvent('blur'))
      }
    }
  })
}

var activeCache = null;
function isActive () {
    if (activeCache !== null) {
        return activeCache;
    }

    activeCache = false;
    var gmailUrl = '//mail.google.com/';

    // trigger the extension based on url
    if (window.location.href.indexOf(gmailUrl) !== -1) {
        activeCache = true;
    }

    return activeCache;
}

function setup () {
    if (!isActive()) {
        return false;
    }

    enableBubble();
}

setup();

export default async (params = {}) => {
    if (!isActive()) {
        return false;
    }

    var data = getData(params);
    const parsedTemplate = addAttachments(
      await parseTemplate(params.quicktext.body, data),
      params.quicktext.attachments
    )

    insertTemplate(Object.assign({
        text: parsedTemplate
    }, params))

    await after(params, data)

    // from field support, when using multiple aliases.
    // set the from field before getting data,
    // to have up-to-date data.
    if (params.quicktext.from) {
        setFromField(params.element, params.quicktext.from);
    }

    return true;
};
