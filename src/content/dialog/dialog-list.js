import {For, Show, createEffect, createSignal, onMount, mergeProps} from 'solid-js'

import IconArrowUpRightSquare from 'bootstrap-icons/icons/arrow-up-right-square.svg'

import config from '../../config.js'

import styles from './dialog-list.css'

const activeTemplateClass = 'active'
// const templateRenderLimit = 42

export default function DialogList (originalProps) {
  const props = mergeProps({
    loggedIn: null,
    showTags: true,
    tags: [],
    list: [],
  }, originalProps)

  let element = null

  const [active, setActive] = createSignal()

  // TODO use a memo to limit number of templates rendered?
  // render less items, for performance
  // props.list = props.list.slice(0, templateRenderLimit)

  createEffect(() => {
    // select first item when list changes,
    // and current item not in list.
    if (
      props.list.length
      && !props.list.find((item) => item.id === active)
    ) {
      return setActive(props.list[0].id)
    }

    return active()
  })

  function scrollToActive (id = '') {
    const newActive = element.querySelector(`[data-id="${id}"]`)
    if (newActive) {
      newActive.scrollIntoView({block: 'nearest'})
    }
  }

  function onMouseOver (e) {
    // hover templates
    const container = e.target.closest('[data-id]')
    if (container) {
      setActive(container.dataset.id)

      // add the title attribute only when hovering the template.
      // speeds up rendering the template list.
      const template = props.list.find((t) => t.id === container.dataset.id)
      if (template) {
        container.title = template._body_plaintext
      }
    }
  }

  function onClick (e) {
    const container = e.target.closest('[data-id]')
    // prevent inserting templates when clicking the edit button
    const editButton = e.target.closest('.btn-edit')
    if (container && !editButton) {
      element.dispatchEvent(new CustomEvent('b-dialog-insert', {
        bubbles: true,
        composed: true,
        detail: container.dataset.id,
      }))
    }
  }

  onMount(() => {
    // keyboard navigation
    element.addEventListener('b-dialog-select', (e) => {
      const index = props.list.findIndex((t) => t.id === active())
      const move = e.detail
      let nextIndex

      if (move === 'next') {
        nextIndex = index + 1
      } else if (move === 'previous') {
        nextIndex = index - 1
      }

      if (typeof nextIndex !== 'undefined' && props.list[nextIndex]) {
        const newActive = props.list[nextIndex].id
        setActive(newActive)
        scrollToActive(newActive)
      }
    })

    // insert with enter
    element.addEventListener('b-dialog-select-active', () => {
      element.dispatchEvent(new CustomEvent('b-dialog-insert', {
        composed: true,
        detail: active(),
      }))
    })

    // select first item
    element.addEventListener('b-dialog-select-first', () => {
      if (props.list.length) {
        const newActive = props.list[0].id
        setActive(newActive)
        scrollToActive(newActive)
      }
    })
  })

  return (
    <div
      ref={element}
      class="dialog-list"
      on:mouseover={onMouseOver}
      onClick={onClick}
      >
      <style>{styles}</style>
      <ul>
        <Show
          when={props.list.length}
          fallback={(
            <div class="list-no-results">
              No templates found
            </div>
          )}
          >
          <For each={props.list}>
            {(t) => (
              <li
                data-id={t.id}
                classList={{
                  'dialog-list-item': true,
                  [activeTemplateClass]: t.id === active(),
                }}
                >
                <div class="d-flex">
                  <h1>{t.title}</h1>
                  <Show when={t.shortcut}>
                    <abbr>{t.shortcut}</abbr>
                  </Show>
                </div>
                <p class="text-secondary">
                  {t._body_plaintext.slice(0, 100)}
                </p>
                <Show when={props.showTags && t.tags && t.tags.length}>
                  <ul class="dialog-tags">
                    <For each={t.tags}>
                      {(tagId) => {
                        const tag = props.tags.find((tag) => tag.id === tagId)
                        if (!tag) {
                          return (<></>)
                        }

                        return (
                          <li
                            style={{
                              '--tag-bg-color': `var(--tag-color-${tag.color})`
                            }}
                            classList={{
                              'text-secondary': !tag.color || tag.color === 'transparent',
                            }}
                          >
                            {tag.title}
                          </li>
                        )
                      }}
                    </For>
                  </ul>
                </Show>

                <Show when={props.loggedIn}>
                  <div class="edit-container dialog-safari-hide">
                    <a
                      href={`${config.functionsUrl}/template/${t.id}`}
                      target="_blank"
                      class="btn btn-sm btn-edit"
                      title="Edit template"
                      >
                      <IconArrowUpRightSquare />
                    </a>
                  </div>
                </Show>
              </li>
            )}
          </For>
        </Show>
      </ul>
    </div>
  )
}
