import {mergeProps} from 'solid-js'

import IconGear from 'bootstrap-icons/icons/gear.svg'
import IconBriskine from '../../icons/briskine-logo-small.svg'

import styles from './dialog-footer.css'

export default function DialogFooter (originalProps) {
  const props = mergeProps({
    shortcut: '',
  }, originalProps)

  return (
    <div class="dialog-footer">
      <style>{styles}</style>
      <div class="d-flex">
        <div class="d-flex flex-fill">
          <button
            type="button"
            class="btn btn-sm btn-actions"
            title="Briskine dialog actions"
            data-b-modal="actions"
            >
            <IconBriskine />
          </button>
        </div>

        <div
          class="dialog-shortcut btn text-secondary"
          title="Press ${shortcut} in any text field to open the Briskine dialog"
          >
          {props.shortcut}
        </div>
        <button
          type="button"
          class="btn btn-sm btn-settings"
          title="Dialog settings"
          data-b-modal="settings"
          >
          <IconGear />
        </button>
      </div>
    </div>
  )
}
