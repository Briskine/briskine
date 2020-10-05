/* Generate locale translations
 */

const https = require('https')
const fs = require('fs')

const extDesc = `Write emails faster! Increase your productivity with templates and keyboard shortcuts on Gmail, Outlook, or LinkedIn.`
const extName = `Gorgias Templates: Email templates for Gmail`
const maxName = 50

function translate (string = '', locale) {
    return new Promise((resolve, reject) => {
        const url = `https://translate.google.com/translate_a/t?client=p&text=${encodeURIComponent(string)}&sl=en&tl=${locale}`
        https.get(url, res => {
            res.setEncoding('utf8')
            let body = ''
            res.on('data', data => {
                body += data;
            })
            res.on('end', () => {
                setTimeout(() => {
                    resolve(body)
                }, 1000)
            })
        })
    })
}

const locales = [
    'am',
    'ar',
    'bg',
    'bn',
    'ca',
    'cs',
    'da',
    'de',
    'el',
    'en',
    'en_GB',
    'en_US',
    'es',
    'es_419',
    'et',
    'fa',
    'fi',
    'fil',
    'fr',
    'gu',
    'he',
    'hi',
    'hr',
    'hu',
    'id',
    'it',
    'ja',
    'kn',
    'ko',
    'lt',
    'lv',
    'ml',
    'mr',
    'ms',
    'nl',
    'no',
    'pl',
    'pt_BR',
    'pt_PT',
    'ro',
    'ru',
    'sk',
    'sl',
    'sr',
    'sv',
    'sw',
    'ta',
    'te',
    'th',
    'tr',
    'uk',
    'vi',
    'zh_CN',
    'zh_TW'
]

const translated = {
    'en': {
        extName: {
            message: extName
        },
        extDesc: {
            message: extDesc
        }
    }
}

async function start () {
    const localesDir = 'src/_locales'

    for (const locale of locales) {
        const localeDir = `${localesDir}/${locale}`
        try {
            fs.mkdirSync(localeDir)
        } catch (err) {}

        let message = '{}'
        try {
            message = fs.readFileSync(`${localeDir}/messages.json`, 'utf8')
        } catch (err) {}

        message = Object.assign(JSON.parse(message), translated[locale])

        if (!message.extName.message) {
            message.extName.message = await translate(extName, locale)
        }

        if (!message.extDesc.message) {
            message.extDesc.message = await translate(extDesc, locale)
        }

        // firefox add-ons require titles to be 50 chars or less
        if (message.extName.message.length > 50) {
            message.extName.message = extName
        }

        fs.writeFileSync(`${localeDir}/messages.json`, JSON.stringify(message, null, 4) + '\n', 'utf8')
    }
}

start()
