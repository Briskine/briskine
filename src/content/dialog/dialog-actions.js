/* globals VERSION */
import {For} from 'solid-js'

import IconPlusSquare from 'bootstrap-icons/icons/plus-square.svg'
import IconArchive from 'bootstrap-icons/icons/archive.svg'
import IconQuestionCircle from 'bootstrap-icons/icons/question-circle.svg'
import IconTwitterX from 'bootstrap-icons/icons/twitter-x.svg'
import IconGlobe from 'bootstrap-icons/icons/globe.svg'

import { functionsUrl, helpUrl, websiteUrl } from '../../config.js'

const actions = [
  {
    title: 'New template',
    icon: IconPlusSquare,
    href: `${functionsUrl}/template/new`,
    class: 'dialog-safari-hide',
  },
  {
    title: 'Manage templates',
    icon: IconArchive,
    href: functionsUrl,
    class: 'dialog-safari-hide',
  },
  {
    title: 'Help Center',
    icon: IconQuestionCircle,
    href: helpUrl,
    class: 'dialog-safari-hide',
  },
  {
    title: 'Briskine website',
    icon: IconGlobe,
    href: websiteUrl,
    class: 'dialog-safari-hide',
  },
  {
    title: 'Follow us on X',
    icon: IconTwitterX,
    href: 'https://x.com/briskineapp',
  },
]

export default function DialogActions () {
  return (
    <div class="dialog-actions dialog-modal">
      <div class="dialog-modal-header">
        <h2 class="text-secondary">
          Briskine v{VERSION}
        </h2>

        <button
          type="button"
          class="btn btn-close"
          title="Close dialog actions"
          data-b-modal="actions"
          />
      </div>
      <div class="dialog-modal-body">
        <ul class="list-group">
          <For each={actions}>
            {(action) => (
              <li>
                <a
                  href={action.href}
                  target="_blank"
                  class="btn d-flex flex-fill"
                  classList={{
                    [action.class]: true,
                  }}
                  >
                  <span class="list-group-icon">{action.icon}</span>
                  <span>{action.title}</span>
                </a>
              </li>
            )}
          </For>
        </ul>
      </div>
    </div>
  )
}
