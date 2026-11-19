import browser from 'webextension-polyfill'

import './open-tutorial.js'
import './update-content.js'
import './context-menu.js'
import './tab-context.js'
import './frame-relay.js'
import '../store/store-background.js'

import {autosync} from '../store/store-api.js'
import debug from '../debug.js'

function startupSync () {
  autosync().catch((err) => debug(['autosync', err], 'warn'))
}

browser.runtime.onStartup.addListener(startupSync)
browser.runtime.onInstalled.addListener(startupSync)


