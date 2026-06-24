import {Show, createEffect, createSignal, createMemo, For, mergeProps} from 'solid-js'

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
    ref: null,
    loggedIn: null,
    loading: null,
    visible: true,
    tags: [],
    templates: [],
    extensionData: {},
  }, originalProps)

  // sort templates only on show, so the list doesn't
  // re-order itself while visible.
  // (after inserting a template, which doesn't look great in the sidebar).
  const [sortCriteria, setSortCriteria] = createSignal({})
  let captured = false

  createEffect(() => {
    // read both, so a logout/login cycle resets the capture too.
    const shown = (
      props.visible === true
      && props.loading === false
    )

    // reset when hidden
    if (!shown) {
      captured = false
      return
    }

    if (captured) {
      return
    }

    captured = true
    setSortCriteria({
      sort: props.extensionData.dialogSort,
      lastUsed: props.extensionData.templatesLastUsed,
    })
  })

  const _templates = createMemo(() => {
    return sortTemplates(
      props.templates,
      sortCriteria().sort,
      sortCriteria().lastUsed,
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
          callbackSelectItem={props.callbackSelectItem}
          ref={props.ref}
          />
      </Show>
    </>
  )
}
