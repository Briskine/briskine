import {createSignal, createResource, Show, Switch, Match, onMount, For, createMemo} from 'solid-js'

import config from '../config.js'
import store from '../store/store-content.js'

import ArrowRepeat from 'bootstrap-icons/icons/arrow-repeat.svg'
import PlusSquareFill from 'bootstrap-icons/icons/plus-square-fill.svg'
import ArchiveFill from 'bootstrap-icons/icons/archive-fill.svg'
import GearFill from 'bootstrap-icons/icons/gear-fill.svg'

function niceTime (minutes) {
  if (!minutes) {
    return '0min'
  }
  if (minutes < 60) {
    return minutes + 'min'
  }
  // 23h and 23m
  if (minutes < 60 * 24) {
    return `${Math.floor(minutes / 60)}h and ${minutes % 60}min`
  } else {
    return `${Math.floor(minutes / (60 * 24))}d, ${Math.floor(minutes % (60 * 24) / 60)}h and ${minutes % (60 * 24) % 60}min`
  }
}

function getStats (words = 0) {
  const avgWPM = 35
  // average WPM
  // http://en.wikipedia.org/wiki/Words_per_minute
  const time = niceTime(Math.round(words / avgWPM))

  return {
    time: time,
    words: words,
  }
}

function MotivationalMessage (props) {
  return (
    <Switch
      fallback={(
        <>
          <span class="fst-italic">Big things have small beginnings</span> &#128170;
        </>
      )}
      >
      <Match when={props.words > 7500}>
        <span class="fst-italic">You're awesome. Just awesome.</span> &#9996;
      </Match>
      <Match when={props.words > 2500}>
        <span class="fst-italic">Did you know mushrooms are one of the largest organisms in the world?</span> &#127812;
      </Match>
      <Match when={props.words > 1500}>
        <span class="fst-italic">Or the equivalent of writing a short story</span> &#128214;
      </Match>
    </Switch>
  )
}

export default function PopupDashboard () {
  const [lastSync, setLastSync] = createSignal(Date.now())
  const [sync, setSync] = createSignal({})
  const [syncRequest] = createResource(sync, async ({timeout}) => {
    await store.autosync(timeout)
    const data = await store.getExtensionData()
    setLastSync(new Date(data.lastSync))

    return refreshAccount()
  })

  const [stats, setStats] = createSignal(getStats(0))

  const [user, setUser] = createSignal({})
  const [customers, setCustomers] = createSignal({})

  function getCustomerTitle (customerId) {
    const customerData = customers()[customerId]
    if (customerData) {
      return customerData.title
    }

    return ''
  }

  const [customer, setCustomer] = createSignal()
  // eslint-disable-next-line solid/reactivity
  const [switchCustomerRequest] = createResource(customer, async (customerId) => {
    await store.setActiveCustomer(customerId)
    setUser({
      ...user(),
      ...{customer: customerId}
    })
  })

  async function refreshAccount () {
    const account = await store.getAccount()
    setUser(account)

    await Promise.all(
      account.customers.map((customerId) => {
        // eslint-disable-next-line solid/reactivity
        return store.getCustomer(customerId).then((customerData) => {
          const updatedCustomers = {...customers()}
          updatedCustomers[customerId] = customerData
          setCustomers(updatedCustomers)
        })
      })
    )
  }

  const isFree = createMemo(() => {
    const plan = customers()[user().customer]?.subscription?.plan
    if (typeof plan === 'undefined') {
      return null
    }

    return plan === 'free'
  }, null)

  function switchTeam (e) {
    setCustomer(e.currentTarget.value)
  }

  onMount(async () => {
    const extensionData = await store.getExtensionData()
    setLastSync(new Date(extensionData.lastSync))
    setStats(getStats(extensionData.words))

    await refreshAccount()
    setSync({})

    // update session
    store.getSession()
  })

  return (
    <div class="popup-dashboard">
      <div class="popup-box popup-logo d-flex justify-content-between">
        <a href={config.websiteUrl} target="_blank">
          <img src="../icons/briskine-combo.svg" width="132" alt="Briskine"/>
        </a>

        <button
          type="button"
          class="btn-sync"
          classList={{
            'btn-sync-loading': syncRequest.loading,
          }}
          disabled={syncRequest.loading}
          title={`Sync templates now \n(Last sync: ${lastSync().toLocaleString()})`}
          onClick={() => setSync({timeout: 1000})}
          >
            <ArrowRepeat />
        </button>
      </div>

      <ul class="list-unstyled popup-menu">
        <Show when={user()?.customers?.length > 1}>
          <li>
            <form class="team-selector">
              <div class="form-text mb-2">
                You're signed in to <strong>{getCustomerTitle(user().customer)}</strong>
              </div>
              <label for="team-select" class="mb-1">
                Switch to a different team:
              </label>
              <div
                classList={{
                  'block-loading': switchCustomerRequest.loading,
                }}
                >
                <select
                  id="team-select"
                  class="form-select"
                  onChange={switchTeam}
                  >
                  <For each={user().customers}>
                    {(id) => (
                      <option
                        value={id}
                        selected={id === user().customer}
                        >
                        {getCustomerTitle(id)}
                      </option>
                    )}
                  </For>
                </select>
              </div>
            </form>
          </li>
        </Show>
        <li>
          <a
            href={`${config.functionsUrl}/template/new`}
            target={config.dashboardTarget}
            >
            <span class="icon"><PlusSquareFill /></span>
            New template
          </a>
        </li>
        <li>
          <a
            href={config.functionsUrl}
            target={config.dashboardTarget}
            >
            <span class="icon"><ArchiveFill /></span>
            Manage templates
          </a>
        </li>
        <li>
          <a
            href={`${config.functionsUrl}/settings`}
            target={config.dashboardTarget}
            >
            <span class="icon"><GearFill /></span>
            Settings
          </a>
        </li>
      </ul>

      <div
        class="popup-box popup-stats"
        classList={{
          'popup-premium': isFree() === false,
          'popup-free': isFree() === true,
        }}
        >
          <Show when={stats().time !== '0min'}>
            <p>
              You saved <strong>{stats().time}</strong> using Briskine!
            </p>
          </Show>

          <div class="popup-stats-details popup-stats-premium">
            <MotivationalMessage words={stats().words} />
          </div>

          <div class="popup-stats-details popup-stats-free">
            <p class="label-upgrade">
              Go Premium to get
              Unlimited Templates
              and
              Template Sharing.
            </p>

            <a
              href={`${config.functionsUrl}/subscription`}
              target={config.dashboardTarget}
              class="btn btn-success btn-upgrade"
              >
              Upgrade to Premium
            </a>
          </div>
      </div>

      <div class="popup-box popup-status">
          <a
            href={`${config.functionsUrl}/account`}
            target={config.dashboardTarget}
            class="popup-user btn btn-link"
            title={`Account settings for ${user().email}`}
            >
            {user().email}
          </a>
          <Show when={isFree() === false}>
            <span class="label-premium">
              Premium
            </span>
          </Show>

          <button
            type="button"
            class="btn btn-link btn-logout"
            onClick={() => store.logout()}
            >
            Log out
          </button>
      </div>
    </div>
  )
}
