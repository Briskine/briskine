import { expect, describe, it, vi, beforeEach } from 'vitest'

const { storage, storageSet, getDocs, trigger } = vi.hoisted(() => {
  const storage = {}
  return {
    storage: storage,
    storageSet: vi.fn(async (data) => Object.assign(storage, data)),
    getDocs: vi.fn(),
    trigger: vi.fn(),
  }
})

// the bundled dep resolves the factory as the namespace, so no default key
vi.mock('webextension-polyfill', () => ({
  storage: {
    local: {
      get: async (key) => ({[key]: storage[key]}),
      set: storageSet,
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
  query: (collection, ...constraints) => ({
    name: collection.name,
    constraints: constraints,
  }),
  where: (field, op, value) => ({
    field: field,
    value: value,
  }),
  documentId: () => ({}),
  and: (...constraints) => constraints,
  or: (...constraints) => constraints,
  limit: () => ({}),
  orderBy: () => ({}),
  getDocs: getDocs,
}))
vi.mock('../background/background-trigger.js', () => ({default: trigger}))
vi.mock('../background/badge.js', () => ({badgeUpdate: vi.fn()}))
vi.mock('../background/open-popup.js', () => ({openPopup: vi.fn()}))
vi.mock('./extension-data.js', () => ({
  getExtensionData: async () => ({}),
  setExtensionData: async () => {},
}))

import { getTemplates, logout, refetchCollections, setActiveCustomer } from './store-api.js'

const cachedTemplate = {
  title: 'Cached',
  body: 'cached',
}

const remoteTemplate = {
  title: 'Remote',
  body: 'remote',
}

const remoteData = {
  users: {user1: {customers: ['customer1', 'customer2']}},
  customers: {
    customer1: {subscription: {plan: 'team'}},
    customer2: {subscription: {plan: 'team'}},
  },
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
    trigger.mockReset()
    storageSet.mockClear()
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

  it('should return the cached data while a refetch is in progress', async () => {
    setCache()
    let respond
    getDocs.mockImplementation((query) => new Promise((resolve) => {
      respond = () => resolve(snapshot(remoteData[query.name]))
    }))

    const refetch = refetchCollections(['templates'])
    await vi.waitFor(() => expect(respond).toBeTypeOf('function'))

    const templates = await getTemplates()
    expect(templates.map((t) => t.title)).to.deep.equal(['Cached'])

    respond()
    await refetch
  })

  it('should refetch the templates when the plan changes', async () => {
    setCache()
    storage.customers = {customer1: {subscription: {plan: 'free'}}}
    online()

    await refetchCollections(['customers'])

    const fetched = getDocs.mock.calls.map(([query]) => query.name)
    expect(fetched).to.deep.equal(['customers', 'templates'])

    const templates = await getTemplates()
    expect(templates.map((t) => t.title)).to.deep.equal(['Remote'])
  })

  it('should not refetch the templates when the plan is the same', async () => {
    setCache()
    online()

    await refetchCollections(['customers'])

    const fetched = getDocs.mock.calls.map(([query]) => query.name)
    expect(fetched).to.deep.equal(['customers'])
  })

  it('should fetch the other collections when fetching the customers fails', async () => {
    setCache()
    getDocs.mockImplementation(async (query) => {
      if (query.name === 'customers') {
        throw new Error('offline')
      }

      return snapshot(remoteData[query.name])
    })

    await expect(refetchCollections()).rejects.toThrow('offline')

    const fetched = getDocs.mock.calls.map(([query]) => query.name)
    expect(fetched).to.include.members(['users', 'tags', 'templates'])

    const templates = await getTemplates()
    expect(templates.map((t) => t.title)).to.deep.equal(['Remote'])
  })

  it('should fetch again when forcing a fetch while a request is in progress', async () => {
    setCache()
    delete storage.templates
    const responses = []
    getDocs.mockImplementation(() => new Promise((resolve) => responses.push(resolve)))

    const stale = getTemplates()
    await vi.waitFor(() => expect(responses).to.have.length(1))

    const refetch = refetchCollections(['templates'])
    responses[0](snapshot({template1: cachedTemplate}))
    await stale

    await vi.waitFor(() => expect(responses).to.have.length(2))
    responses[1](snapshot(remoteData.templates))
    await refetch

    const templates = await getTemplates()
    expect(templates.map((t) => t.title)).to.deep.equal(['Remote'])
  })

  it('should clear the previous customer data when switching customers', async () => {
    setCache()
    const responses = []
    getDocs.mockImplementation((query) => new Promise((resolve) => {
      responses.push(() => resolve(snapshot(remoteData[query.name])))
    }))

    await setActiveCustomer('customer2')

    expect(storage.templates).to.equal(null)
    expect(storage.tags).to.equal(null)
    // an empty list would be cached by the content scripts
    expect(trigger).not.toHaveBeenCalledWith('templates-updated', [])
    expect(trigger).not.toHaveBeenCalledWith('tags-updated', [])

    await vi.waitFor(() => expect(responses).to.have.length(2))
    responses.forEach((respond) => respond())
    await vi.waitFor(() => expect(storage.templates).to.deep.equal(remoteData.templates))
  })

  it('should drop the previous customer data from a request in progress', async () => {
    setCache()
    delete storage.templates
    const responses = {
      templates: [],
      tags: [],
    }
    getDocs.mockImplementation((query) => new Promise((resolve) => {
      responses[query.name].push(resolve)
    }))

    const previous = getTemplates()
    await vi.waitFor(() => expect(responses.templates).to.have.length(1))

    await setActiveCustomer('customer2')
    responses.templates[0](snapshot({template1: cachedTemplate}))
    await previous

    // the refetch for the new customer starts after the previous request
    await vi.waitFor(() => expect(responses.templates).to.have.length(2))
    expect(storage.templates).to.equal(null)
    expect(trigger).not.toHaveBeenCalledWith('templates-updated', expect.arrayContaining([
      expect.objectContaining({title: 'Cached'}),
    ]))

    responses.templates[1](snapshot(remoteData.templates))
    responses.tags.forEach((respond) => respond(snapshot({})))
    await vi.waitFor(() => expect(storage.templates).to.deep.equal(remoteData.templates))
  })

  it('should use the refetched users to get the active customer', async () => {
    setCache()
    online()
    const users = remoteData.users
    // removed from customer1
    remoteData.users = {user1: {customers: ['customer2']}}

    try {
      await refetchCollections()
    } finally {
      remoteData.users = users
    }

    const fetched = getDocs.mock.calls.map(([query]) => query.name)
    expect(fetched[0]).to.equal('users')

    const templateQueries = getDocs.mock.calls
      .map(([query]) => query)
      .filter((query) => query.name === 'templates')
    expect(templateQueries.length).to.be.above(0)
    templateQueries.forEach((query) => {
      expect(JSON.stringify(query)).to.include('"customer2"')
      expect(JSON.stringify(query)).not.to.include('"customer1"')
    })
  })

  it('should drop the data of a request that finishes after logging out', async () => {
    setCache()
    delete storage.templates
    let respond
    getDocs.mockImplementation(() => new Promise((resolve) => {
      respond = resolve
    }))

    const request = getTemplates()
    await vi.waitFor(() => expect(respond).toBeTypeOf('function'))

    const fetchSpy = vi.spyOn(window, 'fetch').mockRejectedValue(new Error('offline'))
    try {
      await logout().catch(() => {})
    } finally {
      fetchSpy.mockRestore()
    }
    respond(snapshot(remoteData.templates))
    await request

    expect(storage.templates).to.equal(undefined)
    expect(trigger).not.toHaveBeenCalledWith('templates-updated', expect.anything())
  })

  it('should not share a request between customers', async () => {
    setCache()
    delete storage.templates
    const responses = []
    getDocs.mockImplementation((query) => new Promise((resolve) => {
      responses.push({
        query: query,
        respond: (data) => resolve(snapshot(data)),
      })
    }))
    const templateResponses = () => responses.filter((r) => r.query.name === 'templates')

    const previous = getTemplates()
    await vi.waitFor(() => expect(templateResponses()).to.have.length(1))

    await setActiveCustomer('customer2')
    const current = getTemplates()
    await vi.waitFor(() => expect(templateResponses()).to.have.length(2))

    responses.forEach(({query, respond}) => {
      const isCurrent = JSON.stringify(query).includes('"customer2"')
      respond(isCurrent ? remoteData[query.name] : {template1: cachedTemplate})
    })

    expect((await previous).map((t) => t.title)).to.deep.equal(['Cached'])
    expect((await current).map((t) => t.title)).to.deep.equal(['Remote'])
    await vi.waitFor(() => expect(storage.templates).to.deep.equal(remoteData.templates))
  })

  it('should switch the customer and clear its data in one write', async () => {
    setCache()
    online()

    await setActiveCustomer('customer2')

    expect(storageSet).toHaveBeenCalledWith({
      templates: null,
      tags: null,
      firebaseUser: {
        id: 'user1',
        customer: 'customer2',
      },
    })
    await vi.waitFor(() => expect(storage.templates).to.deep.equal(remoteData.templates))
  })

  it('should not cache the previous customer data read while switching customers', async () => {
    setCache()
    delete storage.templates
    const responses = []
    getDocs.mockImplementation((query) => new Promise((resolve) => {
      responses.push({
        query: query,
        respond: (data) => resolve(snapshot(data)),
      })
    }))
    let finishWrite
    storageSet.mockImplementationOnce((data) => new Promise((resolve) => {
      finishWrite = () => {
        Object.assign(storage, data)
        resolve()
      }
    }))

    const switching = setActiveCustomer('customer2')
    // reads the previous customer, while the switch is being saved
    const previous = getTemplates()
    await vi.waitFor(() => expect(responses).to.have.length(1))
    expect(JSON.stringify(responses[0].query)).to.include('"customer1"')

    finishWrite()
    await switching
    responses[0].respond({template1: cachedTemplate})
    await previous

    expect(storage.templates).to.equal(null)

    await vi.waitFor(() => expect(responses).to.have.length(3))
    responses.slice(1).forEach(({query, respond}) => respond(remoteData[query.name]))
    await vi.waitFor(() => expect(storage.templates).to.deep.equal(remoteData.templates))
  })

  it('should switch customers once when removed from the active customer', async () => {
    setCache()
    // removed from customer1
    storage.users = {user1: {customers: ['customer2']}}
    online()

    await Promise.all([
      getTemplates(),
      getTemplates(),
    ])

    const switches = storageSet.mock.calls.filter(([data]) => data.firebaseUser)
    expect(switches).to.have.length(1)
    expect(storage.firebaseUser.customer).to.equal('customer2')
    await vi.waitFor(() => expect(storage.templates).to.deep.equal(remoteData.templates))
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
