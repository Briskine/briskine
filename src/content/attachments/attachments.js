const attachmentClassName = 'briskine-attachment'

function getAttachmentMarkup (attachment = {}) {
  return `
    <div contenteditable="false" class="${attachmentClassName}">
      <a
        href="${attachment.url}"
        target="_blank"
        >${attachment.name}</a>
      <button type="button">remove</button>
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

