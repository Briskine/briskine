import iconX from 'bootstrap-icons/icons/x.svg?raw'

import attachmentStyles from './attachments.css'

const attachmentClassName = 'briskine-attachment'

function getAttachmentMarkup (attachment = {}) {
  return `
    <div
      contenteditable="false"
      class="${attachmentClassName}"
      style="
        width: 70%;
        background-color: hsl(200deg 6% 86% / 0.3);
        border-radius: 3px;
        padding: 5px;
      "
      >
      <a
        href="${attachment.url}"
        target="_blank"
        style="
          overflow: hidden;
          font-weight: bold;
          font-size: 13px;
          text-overflow: ellipsis;
          white-space: nowrap;
        "
        >${attachment.name}</a>
      <button
        type="button"
        title="Remove attachment"
        style="display: none;"
        >${iconX}</button>
    </div>
  `
}

export function addAttachments (template = '', attachments = []) {
  if (!attachments.length) {
    return template
  }

  const attachmentsMarkup = attachments
    .map((attachment) => {
      return getAttachmentMarkup(attachment)
    })
    .join('<br>')

  return `${template}<br>${attachmentsMarkup}`
}

function clickAttachment (e) {
  const $attachment = e.target.closest(`.${attachmentClassName}`)
  if (!$attachment) {
    return
  }

  e.preventDefault()
  e.stopPropagation()

  const $attachmentRemoveBtn = e.target.closest('button')
  if ($attachmentRemoveBtn) {
    $attachment.remove()
    return
  }

  const $link = e.target.closest('a')
  window.open($link.href, $link.target)
}

export function setup () {
  document.addEventListener('mousedown', clickAttachment, true)
}

export function destroy () {
  document.removeEventListener('mousedown', clickAttachment, true)
}

