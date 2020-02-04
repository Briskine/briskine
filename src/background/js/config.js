/* globals ENV */
var Config = {
    baseURL: 'http://localhost:5555/',
    apiBaseURL: 'http://localhost:5555/api/1/',
    websiteUrl: 'http://localhost:4000',
    functionsUrl: 'http://localhost:5000/gorgias-templates-development/us-central1'
};

// firebase staging
if (ENV === 'staging') {
    Config = Object.assign(Config, {
        baseURL: 'https://chrome.gorgias.io/',
        apiBaseURL: 'https://chrome.gorgias.io/api/1/',
        functionsUrl: 'https://us-central1-gorgias-templates-staging.cloudfunctions.net'
    });
}

if (ENV === 'production') {
    Config = Object.assign(Config, {
        baseURL: 'https://chrome.gorgias.io/',
        apiBaseURL: 'https://chrome.gorgias.io/api/1/',
        websiteUrl: 'https://templates.gorgias.io',
        functionsUrl: 'https://us-central1-gorgias-templates-production.cloudfunctions.net'
    });
}

export default Config;
