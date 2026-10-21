import {createSignal, createResource, createEffect, on, Show, Switch, Match, onMount, For, createMemo} from 'solid-js'

import { websiteUrl, functionsUrl, dashboardTarget, freeTemplatesLimit } from '../config.js'
import {
  autosync,
  getExtensionData,
  setActiveCustomer,
  getAccount,
  getCustomer,
  getSession,
  getTemplates,
  logout,
} from '../store/store-content.js'

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
    await autosync(timeout)
    const data = await getExtensionData()
    setLastSync(new Date(data.lastSync))

    return refreshAccount()
  })

  const [stats, setStats] = createSignal(getStats(0))
  const [templatesCount, setTemplatesCount] = createSignal(0)
  const atLimit = () => templatesCount() >= freeTemplatesLimit
  const nearLimit = () => !atLimit() && templatesCount() >= freeTemplatesLimit * .9

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
  const [switchCustomerRequest] = createResource(customer, async (customerId) => {
    await setActiveCustomer(customerId)
    setUser((prevUser) => ({
      ...prevUser,
      ...{customer: customerId}
    }))
  })

  async function refreshAccount () {
    const account = await getAccount()
    setUser(account)

    await Promise.all(
      account.customers.map((customerId) => {
        return getCustomer(customerId).then((customerData) => {
          setCustomers((prevCustomers) => ({
            ...prevCustomers,
            [customerId]: customerData,
          }))
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

  // the template count is only shown on the free plan.
  // switching teams changes the templates.
  createEffect(on(
    () => [isFree(), user().customer],
    ([free]) => {
      if (free !== true) {
        return
      }

      getTemplates()
        .then((templates) => setTemplatesCount(templates.length))
        .catch(() => {})
    },
  ))

  function switchTeam (e) {
    setCustomer(e.currentTarget.value)
  }

  onMount(async () => {
    const extensionData = await getExtensionData()
    setLastSync(new Date(extensionData.lastSync))
    setStats(getStats(extensionData.words))

    await refreshAccount()
    setSync({})

    // update session
    getSession()
  })

  return (
    <div class="popup-dashboard">
      <div class="popup-logo d-flex justify-content-between">
        <a href={websiteUrl} target="_blank">
          <img src="../icons/briskine-combo.svg" width="120" alt="Briskine"/>
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

      <Show when={user()?.customers?.length > 1}>
        <form class="team-selector">
          <div class="form-text mb-2">
            You're signed in to <strong>{getCustomerTitle(user().customer)}</strong>
          </div>
          <label for="team-select" class="form-label mb-1">
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
      </Show>

      <ul class="list-unstyled popup-menu">
        <li>
          <a
            href={`${functionsUrl}/template/new/`}
            target={dashboardTarget}
            >
            <span class="icon"><PlusSquareFill /></span>
            New template
          </a>
        </li>
        <li>
          <a
            href={`${functionsUrl}/`}
            target={dashboardTarget}
            >
            <span class="icon"><ArchiveFill /></span>
            Manage templates
          </a>
        </li>
        <li>
          <a
            href={`${functionsUrl}/settings/`}
            target={dashboardTarget}
            >
            <span class="icon"><GearFill /></span>
            Settings
          </a>
        </li>
      </ul>

      <div
        class="popup-stats"
        classList={{
          'popup-premium': isFree() === false,
          'popup-free': isFree() === true,
        }}
        >
          <Show when={stats().time !== '0min'}>
            <p class="popup-saved">
              You saved <strong>{stats().time}</strong> with Briskine.
            </p>
          </Show>

          <div class="popup-stats-details popup-stats-premium">
            <p class="popup-motivation">
              <MotivationalMessage words={stats().words} />
            </p>
          </div>

          <div class="popup-stats-details popup-stats-free">
            <div class="popup-meter-group">
              <div class="popup-meter-label d-flex justify-content-between">
                <strong>Free plan</strong>
                <span>{templatesCount()} of {freeTemplatesLimit} templates</span>
              </div>
              <div
                class="popup-meter"
                classList={{
                  'popup-meter-near': nearLimit(),
                  'popup-meter-full': atLimit(),
                }}
                role="progressbar"
                aria-label="Templates used"
                aria-valuemin="0"
                aria-valuemax={freeTemplatesLimit}
                aria-valuenow={templatesCount()}
                >
                <span style={{width: `${Math.min(templatesCount() / freeTemplatesLimit, 1) * 100}%`}} />
              </div>
            </div>
            <p class="popup-upgrade-reason">
              <Switch fallback="Upgrade for unlimited templates and template sharing.">
                <Match when={atLimit()}>
                  You've reached the free plan's limit. Upgrade to add more templates and share them.
                </Match>
                <Match when={nearLimit()}>
                  You're close to the limit. Upgrade for unlimited templates and template sharing.
                </Match>
              </Switch>
            </p>

            <a
              href={`${functionsUrl}/subscription/`}
              target={dashboardTarget}
              class="btn btn-success btn-wide"
              >
              Upgrade to Premium
            </a>
          </div>
      </div>

      <div class="popup-status">
          <a
            href={`${functionsUrl}/account/`}
            target={dashboardTarget}
            class="popup-user btn btn-link"
            title={`Account settings for ${user().email}`}
            >
            {user().email}
          </a>
          <Show when={isFree() === false}>
            <span class="badge text-bg-warning label-premium">
              Premium
            </span>
          </Show>

          <button
            type="button"
            class="btn btn-link btn-logout"
            onClick={() => logout()}
            >
            Log out
          </button>
      </div>
    </div>
  )
}
