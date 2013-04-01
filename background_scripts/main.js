// Settings
var Settings = {
  get: function(key) {
    if (key in localStorage) {
      return JSON.parse(localStorage[key]);
    } else {
      return this.defaults[key];
    }
  },
  set: function(key, value) {
    if (value === this.defaults[key]) {
      return this.clear(key);
    } else {
      return localStorage[key] = JSON.stringify(value);
    }
  },
  clear: function(key) {
    return delete localStorage[key];
  },
  has: function(key) {
    return key in localStorage;
  },
  defaults: {
    synckey: "",
    syncserver: "http://gmail-quicktext.com/",
    quicktexts: [
      {
          "id": "a0e29d8c0ab9e2fa6ea8b53cf0a9b5d2", // md5 unique identifier
          "title": "Insert 'Hello Name,'",
          "shortcut": "hello",
          // since there can be multiple to addresses we'll take just the first one.
          "template": "Hello <%= to[0].first_name %>,"
      }
    ],
  }
};
var portHandlers = {
  settings: function(args, port) {
    if (args.operation === "get") {
        return port.postMessage({
            key: args.key,
            value: Settings.get(args.key)
        });
    } else {
        return Settings.set(args.key, args.value);
    }
  }
};

chrome.extension.onConnect.addListener(function(port, name) {
  if (portHandlers[port.name]) {
    return port.onMessage.addListener(portHandlers[port.name]);
  }
});
