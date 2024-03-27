import {compileTemplate} from '../sandbox/sandbox-parent.js'
import store from '../../store/store-client.js'

// TODO test PrepareVars, to make sure have to correct behavior
// eg. from should have both from.0.name and from.name, with indexes added as properties
function PrepareVars (vars) {
    if (!vars) {
        return vars;
    }

    var prep = function (data) {
        // convert array to object
        data = Object.assign({}, data);
        var flat = data[0];
        for (var i in flat) {
            if (Object.prototype.hasOwnProperty.call(flat, i)) {
                data[i] = flat[i];
            }
        }
        return data;
    };

    if (vars.to && vars.to.length) {
        vars.to = prep(vars.to);
    }
    if (vars.from && vars.from.length) {
        vars.from = prep(vars.from);
    }
    if (vars.cc && vars.cc.length) {
        vars.cc = prep(vars.cc);
    }
    if (vars.bcc && vars.bcc.length) {
        vars.bcc = prep(vars.bcc);
    }
    return vars;
}

// replace from with name saved in settings
function replaceFrom (from, account = {}) {
  from = from || []

  if (!Array.isArray(from)) {
    from = [from]
  }

  return from.map(function (user) {
    return Object.assign({}, account, user)
  })
}

export default async function parseTemplate (template = '', data = {}) {
  let account = {
    email: '',
    full_name: '',
  }

  try {
    // TODO cache account details so we don't have to wake up the service worker
    // just to parse the template
    account = await store.getAccount()
  } catch (err) {
    // logged-out
  }

  let firstName = ''
  let lastName = ''

  if (account.full_name) {
    const nameParts = account.full_name.trim().split(' ')
    firstName = nameParts.shift()
    lastName = nameParts.join(' ')
  }

  // account variable
  data.account = {
    email: account.email,
    name: account.full_name,
    first_name: firstName,
    last_name: lastName,
  }

  // parse from to array and use it from data={} or getAccount
  data.from = replaceFrom(data.from || {}, data.account)

  const compiledTemplate = await compileTemplate(template, PrepareVars(data))
  return compiledTemplate
}
