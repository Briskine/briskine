Gorgias Chrome - Firestore Development
======================================

This document describes how to setup development for the new Firestore backend.

## Config

Rename the `firebase/config-firebase.sample.js` file to `firebase/config-firebase.js`.

Get the public keys for the Firebase plugin:
- Login into the Firebase console: https://console.firebase.google.com/
- Open project
- Go to Project Settings (cog icon on the top left) > General
- Copy the details on the bottom of the page into their specific variables in the `config-firebase.js` file

To only set-up Staging, open:
https://console.firebase.google.com/project/gorgias-templates-staging/settings/general/web:NmQ3NTg5ZTUtMjg1MC00NzlmLWIxY2YtYWUyYWU0ODcxZGY2

and populate only the `_firebaseConfigStaging` variable.


## Run Staging

Run the extension using Staging data with:

```
yarn staging
```

This will use the deployed Cloud Functions on Staging.


## Local development

Running `yarn run` will require locally running the old API backend and the new cloud functions. See the `gorgias-templates-scripts` repo for more details.

