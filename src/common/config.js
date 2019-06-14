var Config = {
    baseURL: 'http://localhost:5555/',
    apiBaseURL: 'http://localhost:5555/api/1/',
    websiteUrl: 'http://localhost:4000',
    functionsUrl: 'http://localhost:5000/gorgias-templates-staging/us-central1',
    firebase: _firebaseConfigStaging
};

// firebase staging
if (ENV === 'staging') {
    Config = Object.assign(Config, {
        functionsUrl: 'https://us-central1-gorgias-templates-staging.cloudfunctions.net'
    });
}

if (ENV === 'production') {
    Config = Object.assign(Config, {
        baseURL: 'https://chrome.gorgias.io/',
        apiBaseURL: 'https://chrome.gorgias.io/api/1/',
        websiteUrl: 'https://templates.gorgias.io',
        functionsUrl: ''
    });
};
