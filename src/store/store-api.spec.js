import { expect, describe, it, vi, beforeEach } from 'vitest'

const { storage, getDocs } = vi.hoisted(() => ({
  storage: {},
  getDocs: vi.fn(),
}))

// the bundled dep resolves the factory as the namespace, so no default key
vi.mock('webextension-polyfill', () => ({
  storage: {
    local: {
      get: async (key) => ({[key]: storage[key]}),
      set: async (data) => Object.assign(storage, data),
      clear: async () => Object.keys(storage).forEach((key) => delete storage[key]),
    },
  },
}))
vi.mock('firebase/app', () => ({initializeApp: () => ({})}))
vi.mock('firebase/auth/web-extension', () => ({
  initializeAuth: () => ({currentUser: {uid: 'user1'}}),
  indexedDBLocalPersistence: {},
  connectAuthEmulator: () => {},
  signInWithCustomToken: vi.fn(),
  onAuthStateChanged: vi.fn(),
  signOut: vi.fn(),
}))
vi.mock('firebase/firestore/lite', () => ({
  initializeFirestore: () => ({}),
  connectFirestoreEmulator: () => {},
  collection: (_db, name) => ({
    name: name,
    withConverter () {
      return this
    },
  }),
  query: (collection) => ({name: collection.name}),
  where: () => ({}),
  documentId: () => ({}),
  and: () => ({}),
  or: () => ({}),
  limit: () => ({}),
  orderBy: () => ({}),
  getDocs: getDocs,
}))
vi.mock('../background/background-trigger.js', () => ({default: vi.fn()}))
vi.mock('../background/badge.js', () => ({badgeUpdate: vi.fn()}))
vi.mock('../background/open-popup.js', () => ({openPopup: vi.fn()}))
vi.mock('./extension-data.js', () => ({
  getExtensionData: async () => ({}),
  setExtensionData: async () => {},
}))

import { getTemplates, refetchCollections } from './store-api.js'

const cachedTemplate = {
  title: 'Cached',
  body: 'cached',
}

const remoteTemplate = {
  title: 'Remote',
  body: 'remote',
}

const remoteData = {
  users: {user1: {customers: ['customer1']}},
  customers: {customer1: {subscription: {plan: 'team'}}},
  tags: {},
  templates: {template2: remoteTemplate},
}

function snapshot (data = {}) {
  return {
    docs: Object.entries(data).map(([id, doc]) => ({
      id: id,
      data: () => doc,
    })),
  }
}

function online () {
  getDocs.mockImplementation(async (query) => snapshot(remoteData[query.name]))
}

function offline () {
  getDocs.mockRejectedValue(new Error('offline'))
}

function setCache () {
  Object.assign(storage, {
    firebaseUser: {
      id: 'user1',
      customer: 'customer1',
    },
    users: remoteData.users,
    customers: remoteData.customers,
    tags: {},
    templates: {template1: cachedTemplate},
  })
}

describe('store api offline', () => {
  beforeEach(() => {
    Object.keys(storage).forEach((key) => delete storage[key])
    getDocs.mockReset()
  })

  it('should keep the cached data when refetching offline', async () => {
    setCache()
    offline()

    await expect(refetchCollections()).rejects.toThrow('offline')

    const templates = await getTemplates()
    expect(templates.map((t) => t.title)).to.deep.equal(['Cached'])
  })

  it('should replace the cached data when refetching online', async () => {
    setCache()
    online()

    await refetchCollections()

    const templates = await getTemplates()
    expect(templates.map((t) => t.title)).to.deep.equal(['Remote'])
  })

  it('should retry a request that failed', async () => {
    setCache()
    delete storage.templates
    offline()

    await expect(getTemplates()).rejects.toThrow('offline')

    online()
    const templates = await getTemplates()
    expect(templates.map((t) => t.title)).to.deep.equal(['Remote'])
  })
})
