import './attachments.css'

const attachmentClassName = 'briskine-attachment'
const iconUrl = 'https://storage.googleapis.com/briskine-static/attachments/1'

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

function getAttachmentMarkup (attachment = {}) {
  return `
    <table
      cellspacing="5"
      width="70%"
      contenteditable="false"
      class="${attachmentClassName}"
      style="table-layout: fixed; background-color: #f6f5f4; border-radius: 3px; max-width: 400px; margin-bottom: 5px;"
      >
        <tr>
        <td
          style="
            overflow: hidden;
            vertical-align: middle;
            text-overflow: ellipsis;
            white-space: nowrap;
          "
          >
          <a
            href="${attachment.url}"
            target="_blank"
            style="
              font-weight: bold;
              font-size: 13px;
            "
            >
            <span
              style="
                display: inline-block;
                width: 12px;
                height: 16px;
                background-image: url('${iconUrl}/${getIcon(attachment.name)}.png');
                background-repeat: no-repeat;
                background-size: 100%;
                background-position: center;
                vertical-align: middle;
                margin-right: 5px;
              "></span>${attachment.name}
          </a>
        </td>
        <td width="16">
          <button
            type="button"
            title="Remove Briskine attachment"
            style="display: none;"
            ></button>
        </td>
      </tr>
    </table>
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
    .join('')

  return `${template}<br>${attachmentsMarkup}<br>`
}

function clickAttachment (e) {
  const $attachment = e.target.closest(`.${attachmentClassName}`)
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
  window.open($link.href, $link.target)
}

export function setup () {
  document.addEventListener('mousedown', clickAttachment, true)
}

export function destroy () {
  document.removeEventListener('mousedown', clickAttachment, true)
}

