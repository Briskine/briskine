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

export default function DialogListFull (originalProps) {
  const props = mergeProps({
    ref: null,
    loggedIn: null,
    loading: null,
    visible: true,
    tags: [],
    list: [],
    extensionData: {},
  }, originalProps)

  // memo dialogSort so _templates only reruns when the sort settings change,
  // not on every extensionData update (eg. after inserts).
  const dialogSort = createMemo(() => props.extensionData.dialogSort)

  // cache lastUsed so the list doesn't re-order after inserts.
  const [cachedLastUsed, setCachedLastUsed] = createSignal(undefined)

  createEffect(() => {
    // read both, so a logout/login cycle resets the cache too.
    const shown = (
      props.visible === true
      && props.loading === false
    )

    if (!shown) {
      setCachedLastUsed(undefined)
      return
    }

    // setter callback is outside reactive tracking
    setCachedLastUsed(prev => prev || props.extensionData.templatesLastUsed)
  })

  const _templates = createMemo(() => {
    return sortTemplates(props.list, dialogSort(), cachedLastUsed())
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
          extensionData={props.extensionData}
          tags={props.tags}
          callbackSelectItem={props.callbackSelectItem}
          ref={props.ref}
          />
      </Show>
    </>
  )
}
