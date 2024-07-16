import {customElement, noShadowDOM} from 'solid-element'
import {Show, createMemo, For} from 'solid-js'

import sortTemplates from '../../store/sort-templates.js'

function Loader () {
  return (
    <For each={Array(4)}>
      {() => (
        <div class="templates-placeholder">
          <div class="templates-placeholder-text" />
          <div class="templates-placeholder-text templates-placeholder-description" />
        </div>
      )}
    </For>
  )
}

customElement('dialog-templates', {
  loggedIn: null,
  loading: null,
  tags: [],
  templates: [],
  extensionData: {},
}, (props) => {
  noShadowDOM()

  const _templates = createMemo(() => {
    return sortTemplates(
      props.templates,
      props.extensionData.dialogSort,
      props.extensionData.templatesLastUsed,
    )
  })

  return (
    <>
      <Show
        when={props.loading !== true}
        fallback={(
          <Loader />
        )}>
        <dialog-list
          loggedIn={props.loggedIn}
          list={_templates()}
          showTags={props.extensionData.dialogTags}
          tags={props.tags}
          />
      </Show>
    </>
  )
})
