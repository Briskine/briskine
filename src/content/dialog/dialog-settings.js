import {For, mergeProps} from 'solid-js'

import {setExtensionData} from '../../store/store-content.js'
import { functionsUrl } from '../../config.js'

const sortOptions = [
  {
    label: 'Recently used',
    value: 'last_used'
  },
  {
    label: 'Recently modified',
    value: 'modified_datetime'
  },
  {
    label: 'Title',
    value: 'title'
  },
  {
    label: 'Shortcut',
    value: 'shortcut'
  },
]

export default function DialogSettings (originalProps) {
  const props = mergeProps({
    extensionData: {}
  }, originalProps)

  function updateSettings (e) {
    let updatedData = {}
    if (e.target.id === 'dialog_sort') {
      updatedData.dialogSort = e.target.value
    }

    if (e.target.id === 'dialog_tags') {
      updatedData.dialogTags = e.target.checked
    }

    setExtensionData(updatedData)
  }

  return (
    <div class="dialog-settings dialog-modal">
      <div class="dialog-modal-header">
        <h2 class="text-secondary">
          Dialog settings
        </h2>

        <button
          type="button"
          class="btn btn-close"
          title="Close dialog settings"
          data-b-modal="settings"
          />
      </div>
      <div class="dialog-modal-body">
        <form onChange={updateSettings}>
          <div class="form-block d-flex">
            <label for="dialog_sort" class="form-label">
              Sort templates by
            </label>
            <select id="dialog_sort" class="form-select">
              <For each={sortOptions}>
                {(option) => (
                  <option
                    value={option.value}
                    selected={option.value === props.extensionData.dialogSort}
                    >
                    {option.label}
                  </option>
                )}
              </For>
            </select>
          </div>
          <div class="form-block d-flex">
            <label class="form-label">
              Template tags
            </label>
            <div class="form-check">
              <input
                class="form-check-input"
                type="checkbox"
                id="dialog_tags"
                checked={props.extensionData.dialogTags}
                />
              <label class="form-check-label" for="dialog_tags">
                Show tags in the dialog
              </label>
            </div>
          </div>
          <div class="form-block d-flex">
            <label class="form-label">
              General settings
            </label>
            <div>
              <p>
                Manage additional settings for Briskine in the Dashboard.
              </p>
              <a
                href={`${functionsUrl}/settings`}
                target="_blank"
                class="btn dialog-safari-hide"
                >
                Open general settings
              </a>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
