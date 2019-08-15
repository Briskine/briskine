var Config = {
    baseURL: 'http://localhost:5555/',
    apiBaseURL: 'http://localhost:5555/api/1/',
    websiteUrl: 'http://localhost:4000',
    functionsUrl: 'http://localhost:5000/gorgias-templates-development/us-central1/api/1',
    firebase: _firebaseConfigDevelopment
};

// firebase staging
if (ENV === 'staging') {
    Config = Object.assign(Config, {
        functionsUrl: 'https://us-central1-gorgias-templates-staging.cloudfunctions.net/api/1',
        firebase: _firebaseConfigStaging
    });
}

if (ENV === 'production') {
    Config = Object.assign(Config, {
        baseURL: 'https://chrome.gorgias.io/',
        apiBaseURL: 'https://chrome.gorgias.io/api/1/',
        websiteUrl: 'https://templates.gorgias.io',
        functionsUrl: 'https://us-central1-gorgias-templates-production.cloudfunctions.net/api/1',
        firebase: _firebaseConfigProduction
    });
}
