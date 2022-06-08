import {compileTemplate} from '../sandbox/sandbox-parent.js'
import store from '../../store/store-client.js'

const accountCache = {}
store.getAccount()
  .then((res) => {
    accountCache.email = res.email
    accountCache.full_name = res.full_name
  })
  .catch(() => {
    // logged-out
  })


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
function replaceFrom (from, setting) {
    setting = Object.assign({
        firstName: '',
        lastName: ''
    }, setting);
    from = from || [];

    if (!Array.isArray(from)) {
        from = [from];
    }

    return from.map(function (f) {
        var user = Object.assign({}, f);
        user.first_name = user.first_name || setting.firstName;
        user.last_name = user.last_name || setting.lastName;
        user.name = user.name || `${user.first_name} ${user.last_name}`;
        return user;
    });
}

export default async function parseTemplate (template = '', data = {}) {
    let nameSetting = {
        firstName: '',
        lastName: ''
    }
    let email = accountCache.email
    const fullName = accountCache.full_name
    if (fullName) {
      const nameParts = fullName.trim().split(' ')
      nameSetting.firstName = nameParts.shift()
      nameSetting.lastName = nameParts.join(' ')
    }
    // get "from" name from settings
    data.from = replaceFrom(data.from || {}, nameSetting);

    // account variable
    data.account = {
        name: `${nameSetting.firstName} ${nameSetting.lastName}`,
        first_name: nameSetting.firstName,
        last_name: nameSetting.lastName,
        email: email
    };

    const compiledTemplate = await compileTemplate(template, PrepareVars(data))
    return compiledTemplate
}
