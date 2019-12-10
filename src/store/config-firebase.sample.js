const config = {};
config.development = {
    apiKey: '',
    authDomain: '',
    databaseURL: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: ''
};

config.staging = {};
config.production = {};

export default config[ENV];
