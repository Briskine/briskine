// Settings
var Settings = {
  get: function(key) {
    if (key in window.localStorage) {
      return JSON.parse(window.localStorage[key]);
    } else {
      return this.defaults[key];
    }
  },
  set: function(key, value) {
    if (value === this.defaults[key]) {
      return this.clear(key);
    } else {
      return window.localStorage[key] = JSON.stringify(value);
    }
  },
  clear: function(key) {
    return delete window.localStorage[key];
  },
  has: function(key) {
    return key in window.localStorage;
  },
  defaults: {
    baseURL: "https://gmail-quicktext.com/",
    apiBaseURL: "https://gmail-quicktext.com/api/1/",
    //baseURL: "http://localhost:5000/",
    //apiBaseURL: "http://localhost:5000/api/1/",
    quicktexts: [
      {
          "id": "a0e29d8c0ab9e2fa6ea8b53cf0a9b5d2", // md5 unique identifier
          "subject": "",
          "title": "Insert 'Hello Name,'",
          "shortcut": "hello",
          "tags": "",
          // since there can be multiple to addresses we'll take just the first one.
          "body": "Hello <%= to[0].first_name %>,"
      }
    ],
    syncEnabled: false,
    autocompleteEnabled: false, // autocomplete dialog
    tabcompleteEnabled: true // tab completion
  }
};
