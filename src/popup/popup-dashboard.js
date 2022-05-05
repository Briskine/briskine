import {render, html} from 'lit-html'
import {classMap} from 'lit-html/directives/class-map.js'
import {unsafeSVG} from 'lit-html/directives/unsafe-svg.js'

import Config from '../config.js'
import store from '../store/store-client.js'

import {plusSquare, clone, cog} from './popup-icons.js'

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

function getStats () {
  const avgWPM = 25;
  return store.getExtensionData()
    .then((data) => {
      const words = data.words
      // average WPM: http://en.wikipedia.org/wiki/Words_per_minute
      const time = niceTime(Math.round(words / avgWPM))

      return {
        time: time,
        words: words
      }
    })
}

customElements.define(
  'popup-dashboard',
  class extends HTMLElement {
    constructor() {
      super()

      this.stats = {
        time: '0min',
        words: 0,
      }
      getStats().then((res) => {
        this.stats = res
        this.connectedCallback()
      })

      this.user = {}
      this.isFree = null
      this.customers = {}

      this.getCustomerTitle = (customerId) => {
        const customerData = this.customers[customerId]
        if (customerData && customerData.ownerDetails) {
          return customerData.ownerDetails.full_name || customerData.ownerDetails.email
        }

        return ''
      }

      this.switchTeam = (e) => {
        if (e.target.parentNode) {
          e.target.parentNode.classList.add('block-loading')
        }

        const customerId = e.target.value
        store.setActiveCustomer(customerId)
          .then(() => {
            return this.refreshAccount()
          })
      }

      this.addEventListener('click', (e) => {
        if (e.target.classList.contains('js-logout')) {
          return store.logout()
        }
      })

      this.addEventListener('change', (e) => {
        const teamSelect = this.querySelector('#team-select')
        if (e.target === teamSelect) {
          return this.switchTeam(e)
        }
      })

      this.refreshAccount()
    }
    refreshAccount () {
      store.getAccount()
        .then((res) => {
          this.user = res

          // re-render after loading user
          this.connectedCallback()

          return Promise.all(
            this.user.customers.map((customerId) => {
              return store.getCustomer(customerId).then((customerData) => {
                this.customers[customerId] = customerData

                // get current plan from active customer
                if (customerId === this.user.customer) {
                  this.isFree = (customerData.subscription.plan === 'free')
                }

                return customerId
              })
            })
          )
        })
        .then(() => {
          // re-render after loading customers
          this.connectedCallback()
        })
    }
    connectedCallback() {
      render(html`
        <div class="popup-dashboard">
          <div class="popup-box popup-logo">
            <a href=${Config.websiteUrl} target="_blank">
              <img src="../icons/briskine-wordmark.svg" width="100" alt="Briskine"/>
            </a>
          </div>

          <ul class="list-unstyled popup-menu">
            ${this.user.customers && this.user.customers.length > 1 && html`
              <li>
                <form class="team-selector">
                  <div class="form-text mb-2">
                    You're signed in to
                    <strong>
                    ${this.getCustomerTitle(this.user.customer)}'s
                    </strong>
                    team.
                  </div>
                  <label for="team-select" class="mb-1">
                    Switch to a different team:
                  </label>
                  <div>
                    <select
                      id="team-select"
                      class="form-select"
                      >
                      ${this.user.customers.map((id) => {
                        return html`
                          <option
                            value=${id}
                            ?selected=${id === this.user.customer}
                            >
                            ${this.getCustomerTitle(id)}'s team
                          </option>
                        `
                      })}
                    </select>
                  </div>
                </form>
              </li>
            ` || ''}
            <li>
              <a
                href=${`${Config.functionsUrl}/template/new`}
                target=${Config.dashboardTarget}
                >
                <span class="icon">${unsafeSVG(plusSquare)}</span>
                New template
              </a>
            </li>
            <li>
              <a
                href=${Config.functionsUrl}
                target=${Config.dashboardTarget}
                >
                <span class="icon">${unsafeSVG(clone)}</span>
                Manage templates
              </a>
            </li>
            <li>
              <a
                href=${`${Config.functionsUrl}/settings`}
                target=${Config.dashboardTarget}
                >
                <span class="icon">${unsafeSVG(cog)}</span>
                Settings
              </a>
            </li>
          </ul>

          <div
            class=${classMap({
              'popup-box popup-stats': true,
              'popup-premium': this.isFree === false,
              'popup-free': this.isFree === true,
            })}
            >
              ${this.stats.time !== '0min' ? html`
                <p>
                  You saved <strong>${this.stats.time}</strong> using Briskine!
                </p>
              ` : ''}

              <div class="popup-stats-details popup-stats-premium">
                ${this.stats.words < 1500 ? html`
                  <span class="font-italic">Big things have small beginnings</span> &#128170;
                ` : ''}
                ${this.stats.words > 1500 && this.stats.words < 2500 ? html`
                  <span class="font-italic">Or the equivalent of writing a short story</span> &#128214;
                ` : ''}
                ${this.stats.words >= 2500 && this.stats.words < 7500 ? html`
                  <span class="font-italic">Did you know mushrooms are one of the largest organisms in the world?</span> &#127812;
                ` : ''}
                ${this.stats.words >= 7500 ? html`
                  <span class="font-italic">You're awesome. Just awesome.</span> &#9996;
                ` : ''}
              </div>

              <div class="popup-stats-details popup-stats-free">
                <p class="label-upgrade">
                  Go Premium to get
                  Unlimited Templates
                  and
                  Template Sharing.
                </p>

                <a
                  href=${`${Config.functionsUrl}/subscription`}
                  target=${Config.dashboardTarget}
                  class="btn btn-success btn-upgrade"
                  >
                  Upgrade to Premium
                </a>
              </div>
          </div>

          <div class="popup-box popup-status">
              <a
                href=${`${Config.functionsUrl}/account`}
                target=${Config.dashboardTarget}
                class="popup-user"
                title=${`Account Settings for ${this.user.email}`}
                >
                ${this.user.email}
              </a>
              ${this.isFree === false ? html`
                <span class="label-premium">
                  Premium
                </span>
              ` : ''}

              <button type="button" class="js-logout btn btn-link btn-logout">
                Log out
              </button>
          </div>
        </div>
      `, this)
    }
  }
)
