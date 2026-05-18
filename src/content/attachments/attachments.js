import './attachments.css'

const attachmentClassName = 'briskine-attachment'
const iconUrl = 'https://static.briskine.com/attachments/1'

function getIcon (name = '') {
  switch (name.split('.').pop()) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'svg':
      return 'file-earmark-image-fill'
    case 'doc':
    case 'docx':
      return 'file-earmark-word-fill'
    case 'pdf':
      return 'file-earmark-pdf-fill'
    case 'tar':
    case 'zip':
    case 'rar':
    case 'gz':
    case 'uca':
    case 'dmg':
    case 'iso':
      return 'file-earmark-zip-fill'
    case 'riff':
    case 'wav':
    case 'bwf':
    case 'ogg':
    case 'aiff':
    case 'caf':
    case 'flac':
    case 'mp3':
    case 'wma':
    case 'au':
    case 'aac':
    case 'mp4':
    case 'm4a':
      return 'file-earmark-music-fill'
    case 'webm':
    case 'flv':
    case 'f4v':
    case 'f4p':
    case 'f4a':
    case 'f4b':
    case 'ogv':
    case 'avi':
    case 'mov':
    case 'qt':
    case 'yuv':
    case 'm4p':
    case 'm4v':
    case 'mpg':
    case 'mpeg':
    case 'm2v':
    case 'svi':
    case '3gp':
    case 'roq':
      return 'file-earmark-play-fill'
    case 'js':
    case 'txt':
    case 'css':
    case 'html':
    case 'json':
      return 'file-earmark-text-fill'
  }

  return 'file-earmark-fill'
}

function getSafeUrl (url) {
  try {
    const {protocol} = new URL(url)
    return (protocol === 'https:' || protocol === 'http:') ? url : ''
  } catch {
    return ''
  }
}

function getAttachmentMarkup (attachment = {}) {
  const table = document.createElement('table')
  table.setAttribute('contenteditable', 'false')
  table.className = attachmentClassName
  table.style.cssText = `
    table-layout: fixed;
    width: 70%;
    max-width: 400px;
    margin-bottom: 5px;
    background-color: #f6f5f4;
    border-radius: 3px;
    border-collapse: separate;
    border-spacing: 5px;
  `

  const tr = document.createElement('tr')

  const tdName = document.createElement('td')
  tdName.style.cssText = `
    overflow: hidden;
    vertical-align: middle;
    text-overflow: ellipsis;
    white-space: nowrap;
  `

  const a = document.createElement('a')
  a.href = getSafeUrl(attachment.url)
  a.target = '_blank'
  a.style.cssText = `
    font-weight: bold;
    font-size: 13px;
  `

  const span = document.createElement('span')
  span.style.cssText = `
    display: inline-block;
    width: 12px;
    height: 16px;
    margin-right: 5px;
    background-image: url('${iconUrl}/${getIcon(attachment.name)}.png');
    background-repeat: no-repeat;
    background-size: 100%;
    background-position: center;
    vertical-align: middle;
  `

  a.appendChild(span)
  a.appendChild(document.createTextNode(attachment.name))
  tdName.appendChild(a)

  const tdBtn = document.createElement('td')
  tdBtn.style.width = '16px'

  const button = document.createElement('button')
  button.type = 'button'
  button.title = 'Remove Briskine attachment'
  button.style.display = 'none'

  tdBtn.appendChild(button)
  tr.appendChild(tdName)
  tr.appendChild(tdBtn)
  table.appendChild(tr)

  return table.outerHTML
}

export function addAttachments (template = '', attachments = []) {
  if (!attachments.length) {
    return template
  }

  const attachmentsMarkup = attachments
    .map((attachment) => {
      return getAttachmentMarkup(attachment)
    })
    .join('')

  return `${template}<br>${attachmentsMarkup}<br>`
}

function clickAttachment (e) {
  const $attachment = e?.target?.closest?.(`.${attachmentClassName}`)
  // allow right-click
  if (!$attachment || e.button !== 0) {
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
  if ($link) {
    window.open($link.href, $link.target)
  }
}

export function setup () {
  document.addEventListener('mousedown', clickAttachment, true)
}

export function destroy () {
  document.removeEventListener('mousedown', clickAttachment, true)
}
