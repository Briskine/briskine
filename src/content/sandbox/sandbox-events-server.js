import Messenger from '../messenger/messenger.js'

export const {handshake, respond, request} = Messenger({ type: 'server' })
