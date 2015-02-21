# -*- coding: utf-8 -*-

import os
import requests
import urllib
import json
from copy import deepcopy

def main():
    """"""
    curdir = os.path.dirname(__file__)
    en_messages = json.load(open(os.path.join(curdir, "src/_locales/en/messages.json")))

    for locale in os.listdir(os.path.join(curdir, "src/_locales")):
        if locale == 'en' or locale.startswith("."):
            continue

        locale_data = deepcopy(en_messages)
        for key, data in locale_data.items():
            message = data['message'].encode('utf-8').replace("™", '')
            if key == "extName":
                message = message.replace("Gorgias - ", "")

            url = "http://translate.google.com/translate_a/t?client=p&text=%s&sl=en&tl=%s" % (urllib.quote(message), locale)
            r = requests.get(url)

            translated = ""
            for s in r.json()['sentences']:
                translated += s['trans'].encode('utf-8')
            data['message'] = translated.replace("Gmail", "Gmail™").replace("Outlook", "Outlook™").replace("LinkedIn", "LinkedIn™")
            if key == "extName":
                data['message'] = "Gorgias - " + data['message']

        target_file = open(os.path.join(curdir, "src/_locales/", locale, "messages.json"), "wb")
        json.dump(locale_data, target_file, indent=4, ensure_ascii=False)

if __name__ == '__main__':
    main()
