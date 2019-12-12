Gorgias Chrome - Firestore Development
======================================

This document describes how to setup development for the new Firestore backend.

## Config

Rename the `src/store/config-firebase.sample.js` file to `src/store/config-firebase.js`.

Get the public keys for the Firebase plugin:
- Login into the Firebase console: https://console.firebase.google.com/
- Open project
- Go to Project Settings (cog icon on the top left) > General
- Copy the details on the bottom of the page into their specific variables in the `config-firebase.js` file

To only set-up Development, open:
https://console.firebase.google.com/project/gorgias-templates-development/settings/general/web:NzQwZWRiM2UtZDE2NC00OWJkLWFmYmEtMjQwOTM0NDA5Zjc2

and populate the config variable.

## Development

Local development will use the `gorgias-templates-development` Firebase project.

Requirements:
- `config.development` variable.
- Python API running locally
- Cloud Functions running locally (see `templates-script` repo)
- Templates Website running locally (for Subscribe)


Run with:

```
yarn run
```

## Staging

Staging will use the `gorgias-templates-staging` Firebase project.

Run the extension using Staging data with:

```
yarn staging
```

This will use the deployed Cloud Functions on Staging.

