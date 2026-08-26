import sortTemplates from '../store/sort-templates.js'

const templateSlotPrefix = 'template-'

export const templatesLimit = 30

export function getTemplateSlotId (index) {
  return `${templateSlotPrefix}${index}`
}

export function getTemplateSlot (menuItemId) {
  return Number(String(menuItemId).replace(templateSlotPrefix, ''))
}

export function getSlotTemplates (templates = [], sort, lastUsed) {
  return sortTemplates(templates, sort, lastUsed).slice(0, templatesLimit)
}

export function getSlotState (template) {
  if (!template) {
    return {visible: false}
  }

  return {
    title: `${template.title}${template.shortcut ? ` (${template.shortcut})` : ''}`,
    visible: true,
  }
}
