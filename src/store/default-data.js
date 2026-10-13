/* globals ENV */
import htmlToText from '../content/utils/html-to-text.js'

export const defaultSettings = {
  dialog_enabled: true,
  dialog_button: true,
  dialog_shortcut: 'ctrl+space',

  expand_enabled: true,
  expand_shortcut: 'tab',

  blacklist: [],
  share_all: false,
}

export const defaultTags = [
  {title: 'en', color: 'blue'},
  {title: 'greetings', color: 'green'},
  {title: 'followup'},
  {title: 'closing'},
  {title: 'personal'},
].map((tag, index) => {
  return {
    ...tag,
    id: String(index),
  }
})

function filterDefaultTags (titles = []) {
  return defaultTags
    .filter((tag) => {
      if (titles.length) {
        return titles.includes(tag.title)
      }
      return true
    })
    .map((tag) => tag.id)
}

export function getDefaultTemplates () {
  const defaultTemplates = [
    {
      title: 'Say Hello',
      shortcut: 'h',
      subject: '',
      tags: filterDefaultTags(['en', 'greetings']),
      body: '<div>Hello {{to.first_name}},</div><div></div>'
    },
    {
      title: 'Nice talking to you',
      shortcut: 'nic',
      subject: '',
      tags: filterDefaultTags(['en', 'followup']),
      body: '<div>It was nice talking to you.</div>'
    },
    {
      title: 'Kind Regards',
      shortcut: 'kr',
      subject: '',
      tags: filterDefaultTags(['en', 'closing']),
      body: '<div>Kind regards,</div><div>{{from.first_name}}.</div>'
    },
    {
      title: 'My email',
      shortcut: 'e',
      subject: '',
      tags: filterDefaultTags(['en', 'personal']),
      body: '<div>{{from.email}}</div>'
    },
  ]

  if (ENV === 'development') {
    let allVarsBody = '<!-- Comment -->'

    allVarsBody += [ 'account', 'from' ].map((field) => {
      return `
        <div>
          <strong># ${field}</strong>
        </div>
        {{#each ${field}}}
          <div>
            {{@key}}: {{this}}
          </div>
        {{/each}}
      `
    }).join('')

    allVarsBody += [ 'to', 'cc', 'bcc' ].map((field) => {
      return `
        <div>
          <strong># ${field}</strong>
        </div>
        {{#each ${field}}}
          <div>
            {{@key}}:
            {{#each this}}
              <div>
                {{@key}}: {{this}}
              </div>
            {{/each}}
          </div>
        {{/each}}
      `
    }).join('')

    allVarsBody += `
      <div>subject: {{subject}}</div>
      <div>next week: {{moment add='7;days' format='DD MMMM'}}</div>
      <div>last week: {{moment subtract='7;days'}}</div>
      <div><span>we      ek number:</span>   <span>{{moment week=''}}</span></div>
      <div>cursor: {{cursor}}</div>
      <div>random: {{random 'Hello' 'Hi' 'Hey'}}</div>
      <div>domain: {{capitalizeAll (text (text (lookup (text (lookup (text to.email "split" "@") 1) "split" ".") 0) "replaceAll" "-" " ") "toLowerCase")}}</div>
      <div>css title: {{css "title"}}</div>
      <div>css first link: {{css "a" "href"}}</div>
      <div>css text helper: {{text (css "title") "toUpperCase"}}</div>
      <div>css moment helper: {{css "time" "datetime"}} -> {{moment (css "time" "datetime") format="DD MMMM YYYY"}}</div>
      <div>site: {{#site "linkedin.com"}}{{to.first_name}} / {{@site.url}} / {{@site.domain}}{{@site.path}} / {{css "title"}}{{else}}no linkedin tab{{/site}}</div>
      <div>eachSite: {{#eachSite "linkedin.com"}}[{{@site.title}} / {{css "title"}} / {{to.first_name}} ]{{else}}no linkedin tabs{{/eachSite}}</div>
      <div><img src="https://www.briskine.com/images/promo-large.png" width="100" height="73"></div>
    `

    defaultTemplates.push({
      title: 'allvars',
      shortcut: 'allvars',
      subject: 'Subject',
      body: allVarsBody,
      to: 'to@briskine.com',
      cc: 'cc@briskine.com, cc2@briskine.com',
      bcc: 'bcc@briskine.com',
      from: 'support@briskine.com'
    })

    defaultTemplates.push({
      title: 'allforms',
      shortcut: 'allforms',
      subject: 'Order #{{@form.order}} ({{@form.tone}})',
      to: '{{@form.email}}',
      body: `
        {{~#hidden}}
          <div><strong>Hidden: shown in the form, not inserted.</strong></div>
          <div>Tone: {{#select id="tone"}}{{option "Formal"}}{{option "Friendly" value="friendly"}}{{/select}}</div>
          <div>{{input type="checkbox" id="refund" label="Include refund"}} Include refund</div>
          <div>{{input type="checkbox" id="ps" checked=true}} Add P.S.</div>
          <div>Highlight: {{input type="color" id="highlight" value="#ffcc00"}}</div>
        {{/hidden~}}
        <div>{{#if (compare "===" @form.tone "Formal")}}Dear{{else}}Hi{{/if}} {{input id="first-name" placeholder="First name" required=true}},</div>
        <div>first name again (same id, kept in sync): {{input id="first-name"}}</div>
        <div>first name from @form: {{capitalize @form.[first-name]}}</div>
        <div>order: #{{input type="number" id="order" placeholder="Order" min=1 required=true}}</div>
        <div>email: {{input type="email" id="email" placeholder="Email"}}</div>
        <div>url: {{input type="url" id="url" value="https://www.briskine.com"}}</div>
        <div>tel: {{input type="tel" id="tel" pattern="[0-9 +]+" placeholder="Digits, spaces, +"}}</div>
        <div>date: {{input type="date" id="date"}} -> {{moment @form.date format="dddd, MMMM D"}}</div>
        <div>time: {{input type="time" id="time" value="09:30"}}</div>
        <div>datetime-local: {{input type="datetime-local" id="when"}} -> {{moment @form.when format="LLLL"}}</div>
        <div>month: {{input type="month" id="month"}} -> {{moment @form.month format="MMMM YYYY"}}</div>
        <div>week: {{input type="week" id="week"}} -> {{moment @form.week format="[week of] MMMM D"}}</div>
        <div>color: <span style="background: {{@form.highlight}}">highlighted with {{@form.highlight}}</span></div>
        <div>cause: {{#select id="cause"}}
          {{option "a delay at our warehouse" value="a warehouse delay"}}
          {{option "Carrier issue" value="an issue with the carrier"}}
        {{/select}}</div>
        <div>intro (block options): {{#select id="intro"}}
          {{#option label="Short"}}<em>Thanks!</em>{{/option}}
          {{#option label="Long"}}<strong>Thank you for {{#if @form.[first-name]}}your message, {{@form.[first-name]}}{{else}}reaching out{{/if}}.</strong>{{/option}}
        {{/select}}</div>
        <div>tools (multiple): {{#select id="tools" multiple=true value="Gmail"}}{{option "Gmail"}}{{option "Outlook"}}{{option "LinkedIn"}}{{/select}} -> {{list @form.tools "join" " + "}}</div>
        {{#if @form.refund}}
          <div>refund: {{input type="number" id="amount" placeholder="Amount" min=0 step="0.01" required=true}} USD
            {{#if (compare ">=" @form.amount 100)}}(needs approval){{/if}}
          </div>
          <div>{{input type="checkbox" id="partial"}} partial refund</div>
          {{#if @form.partial}}
            <div>reason: {{input id="reason" placeholder="Reason"}}</div>
          {{/if}}
        {{/if}}
        <div>notes: {{textarea id="notes" rows=3 placeholder="Newlines become line breaks"}}</div>
        <div>random (same in the form and the template): {{random "one" "two" "three" "four" "five"}}</div>
        <div>now (same in the form and the template): {{moment format="HH:mm:ss"}}</div>
        <div>cursor: {{cursor}}</div>
        {{#if @form.ps}}<div>P.S. {{input id="ps-text" value="See you soon!"}}</div>{{/if}}
      `,
    })

    defaultTemplates.push({
      title: 'cursors',
      shortcut: 'cur',
      body: `
        <style>div {}</style>
        <div>empty={{cursor}}</div>
        <div>empty with space= {{cursor}}</div>
        <!-- comment -->
        <div>placeholder={{#cursor}}placeholder{{/cursor}}</div>
        <div>placeholder from.first_name={{#cursor}}{{from.first_name}}{{/cursor}}</div>
        <div>
          styled placeholder= <span style="color: red; font-weight: bold">{{#cursor}}red{{/cursor}}</span>
        </div>
        <div>empty2={{cursor}}</div>
        <div>
          block=
          {{#cursor}}<strong>block</strong>{{/cursor}}
        </div>
        <div>
          block2= <span style="color: hotpink"><strong>{{#cursor}}block{{/cursor}}</strong></style>
        </div>
      `,
    })

    defaultTemplates.push({
      title: 'broken',
      shortcut: 'broken',
      body: 'Hello {{to.first_name}'
    })

    defaultTemplates.push({
      title: 'attachment',
      shortcut: 'attachment',
      body: 'attachment',
      attachments: [
        {
          name: 'briskine.svg',
          url: 'https://www.briskine.com/favicon.svg',
        },
        {
          name: 'briskine.doc',
          url: 'https://www.briskine.com/favicon.svg',
        },
        {
          name: 'briskine.pdf',
          url: 'https://www.briskine.com/favicon.svg',
        },
        {
          name: 'briskine.zip',
          url: 'https://www.briskine.com/favicon.svg',
        },
        {
          name: 'briskine.mp3',
          url: 'https://www.briskine.com/favicon.svg',
        },
        {
          name: 'briskine.webm',
          url: 'https://www.briskine.com/favicon.svg',
        },
        {
          name: 'briskine.txt',
          url: 'https://www.briskine.com/favicon.svg',
        },
        {
          name: 'briskine.generic',
          url: 'https://www.briskine.com/favicon.svg',
        },
      ]
    })
  }

  return defaultTemplates
    .map((template, index) => {
      const id = String(index)
      return Object.assign({
        id: id,
        _body_plaintext: htmlToText(template.body),
      }, template)
    })
}
