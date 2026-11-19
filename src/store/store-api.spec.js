import { expect, describe, it, vi, beforeEach } from 'vitest'

const { storage, storageSet, getDocs, trigger, auth, authListeners } = vi.hoisted(() => {
  const storage = {}
  return {
    storage: storage,
    storageSet: vi.fn(async (data) => Object.assign(storage, data)),
    getDocs: vi.fn(),
    trigger: vi.fn(),
    auth: {currentUser: {uid: 'user1'}},
    authListeners: [],
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
  initializeAuth: () => auth,
  indexedDBLocalPersistence: {},
  connectAuthEmulator: () => {},
  signInWithCustomToken: vi.fn(),
  onAuthStateChanged: (_auth, callback) => {
    authListeners.push(callback)
    return () => {}
  },
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
  where: (field, _op, value) => ({
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

import { getSignedInUser, getTemplates, logout, refetchCollections, setActiveCustomer } from './store-api.js'

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
    customer3: {subscription: {plan: 'team'}},
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

// responds right away to the queries for the customer,
// and holds the other queries until they're released.
function respondForCustomer (customerId) {
  const held = []
  getDocs.mockImplementation((query) => {
    if (JSON.stringify(query).includes(`"${customerId}"`) || ['users', 'customers'].includes(query.name)) {
      return Promise.resolve(snapshot(remoteData[query.name]))
    }

    return new Promise((resolve) => {
      held.push(() => resolve(snapshot({template1: cachedTemplate})))
    })
  })

  return held
}

describe('store api offline', () => {
  beforeEach(() => {
    Object.keys(storage).forEach((key) => delete storage[key])
    getDocs.mockReset()
    trigger.mockReset()
    storageSet.mockClear()
    // a failed test can leave firebase without a user
    auth.currentUser = {uid: 'user1'}
    authListeners.length = 0
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

  it('should switch the customer and its data in one write', async () => {
    setCache()
    online()

    await setActiveCustomer('customer2')

    expect(storageSet).toHaveBeenCalledWith({
      templates: remoteData.templates,
      tags: remoteData.tags,
      firebaseUser: {
        id: 'user1',
        customer: 'customer2',
      },
    })
    expect(trigger).toHaveBeenCalledWith('templates-updated', [
      expect.objectContaining({title: 'Remote'}),
    ])
    expect(trigger).toHaveBeenCalledWith('tags-updated', [])
  })

  it('should not switch the customer when fetching its data fails', async () => {
    setCache()
    offline()

    await expect(setActiveCustomer('customer2')).rejects.toThrow('offline')

    expect(storage.firebaseUser.customer).to.equal('customer1')
    expect(storage.templates).to.deep.equal({template1: cachedTemplate})
    expect(trigger).not.toHaveBeenCalledWith('templates-updated', expect.anything())
  })

  it('should fetch the customers when switching to a customer that is not cached', async () => {
    setCache()
    storage.customers = {customer1: remoteData.customers.customer1}
    online()

    await setActiveCustomer('customer2')

    const fetched = getDocs.mock.calls.map(([query]) => query.name)
    expect(fetched[0]).to.equal('customers')
    expect(fetched).to.include.members(['templates', 'tags'])
    expect(storage.firebaseUser.customer).to.equal('customer2')
  })

  it('should not cache the previous customer data from a request in progress', async () => {
    setCache()
    delete storage.templates
    const held = respondForCustomer('customer2')

    const previous = getTemplates()
    await vi.waitFor(() => expect(held).to.have.length(1))

    await setActiveCustomer('customer2')
    held.forEach((respond) => respond())
    await previous

    expect(storage.templates).to.deep.equal(remoteData.templates)
  })

  it('should not cache the previous customer data read while saving the switch', async () => {
    setCache()
    delete storage.templates
    const held = respondForCustomer('customer2')
    let finishWrite
    storageSet.mockImplementationOnce((data) => new Promise((resolve) => {
      finishWrite = () => {
        Object.assign(storage, data)
        resolve()
      }
    }))

    const switching = setActiveCustomer('customer2')
    await vi.waitFor(() => expect(finishWrite).toBeTypeOf('function'))
    // reads the previous customer, while the switch is being saved
    const previous = getTemplates()
    await vi.waitFor(() => expect(held).to.have.length(1))

    finishWrite()
    await switching
    held.forEach((respond) => respond())
    await previous

    expect(storage.templates).to.deep.equal(remoteData.templates)
  })

  it('should not switch the customer after logging out while fetching', async () => {
    setCache()
    const held = respondForCustomer('customer1')

    const switching = setActiveCustomer('customer2')
    await vi.waitFor(() => expect(held).to.have.length(2))

    const fetchSpy = vi.spyOn(window, 'fetch').mockRejectedValue(new Error('offline'))
    try {
      await logout().catch(() => {})
    } finally {
      fetchSpy.mockRestore()
    }

    held.forEach((respond) => respond())
    await expect(switching).rejects.toBe('switch-cancelled')

    // logging out clears the storage
    expect(storage.firebaseUser?.customer).to.equal(undefined)
    expect(storage.templates).to.equal(undefined)
  })

  it('should switch in the background when removed from the active customer', async () => {
    setCache()
    // removed from customer1
    storage.users = {user1: {customers: ['customer2']}}
    online()

    const results = await Promise.all([
      getTemplates(),
      getTemplates(),
    ])

    // keeps the cached data until the switch is saved
    results.forEach((templates) => {
      expect(templates.map((t) => t.title)).to.deep.equal(['Cached'])
    })

    await vi.waitFor(() => expect(storage.firebaseUser.customer).to.equal('customer2'))
    const switches = storageSet.mock.calls.filter(([data]) => data.firebaseUser)
    expect(switches).to.have.length(1)
    expect(storage.templates).to.deep.equal(remoteData.templates)
  })

  it('should not replace a customer picked while switching automatically', async () => {
    setCache()
    // removed from customer1
    storage.users = {user1: {customers: ['customer2', 'customer3']}}
    const held = respondForCustomer('customer2')

    // picked in the popup
    const picked = setActiveCustomer('customer3')
    await vi.waitFor(() => expect(held).to.have.length(2))
    // reads the removed customer before the picked one is saved
    await getSignedInUser()

    held.forEach((respond) => respond())
    await picked
    await vi.waitFor(() => expect(storageSet.mock.calls.filter(([data]) => data.firebaseUser)).to.have.length(1))
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(storage.firebaseUser.customer).to.equal('customer3')
  })

  it('should not switch when removed from every customer', async () => {
    setCache()
    storage.users = {user1: {customers: []}}
    online()

    await getSignedInUser()
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(getDocs).not.toHaveBeenCalled()
    expect(storageSet.mock.calls.filter(([data]) => data.firebaseUser)).to.have.length(0)
  })

  it('should wait for firebase to restore the user when switching', async () => {
    setCache()
    online()
    auth.currentUser = null

    const switching = setActiveCustomer('customer2')
    await vi.waitFor(() => expect(authListeners).to.have.length(1))

    auth.currentUser = {uid: 'user1'}
    authListeners.pop()(auth.currentUser)
    await switching

    expect(storage.firebaseUser.customer).to.equal('customer2')
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
