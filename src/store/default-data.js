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
      <div>week number: {{moment week=''}}</div>
      <div>choice: {{choice 'Hello, Hi, Hey'}}</div>
      <div>domain: {{domain to.email}}</div>
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
