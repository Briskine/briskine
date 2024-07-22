import {Show, createMemo, For, mergeProps} from 'solid-js'

import sortTemplates from '../../store/sort-templates.js'
import DialogList from './dialog-list.js'

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

export default function DialogTemplates (originalProps) {
  const props = mergeProps({
    loggedIn: null,
    loading: null,
    tags: [],
    templates: [],
    extensionData: {},
  }, originalProps)

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
        <DialogList
          loggedIn={props.loggedIn}
          list={_templates()}
          showTags={props.extensionData.dialogTags}
          tags={props.tags}
          />
      </Show>
    </>
  )
}
