import store from '../../store/store-client.js'
import {respond} from '../sandbox/sandbox-messenger-server.js'

respond('helper-_sender-account', () => {
  return store.getAccount()
})
