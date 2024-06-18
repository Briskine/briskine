import browser from 'webextension-polyfill'

import './open-tutorial.js'
import './update-content.js'
import './context-menu.js'
import '../store/store-background.js'

import {autosync} from '../store/store-api.js'

browser.runtime.onStartup.addListener(() => autosync())
browser.runtime.onInstalled.addListener(() => autosync())


