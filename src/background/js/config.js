/* globals ENV */
var Config = {
    baseURL: 'http://localhost:5555/',
    apiBaseURL: 'http://localhost:5555/api/1/',
    websiteUrl: 'http://localhost:4000',
    functionsUrl: 'http://localhost:5000'
};

// firebase staging
if (ENV === 'staging') {
    Config = Object.assign(Config, {
        baseURL: 'https://chrome.gorgias.io/',
        apiBaseURL: 'https://chrome.gorgias.io/api/1/',
        functionsUrl: 'https://staging.gorgiastemplates.com'
    });
}

if (ENV === 'production') {
    Config = Object.assign(Config, {
        baseURL: 'https://chrome.gorgias.io/',
        apiBaseURL: 'https://chrome.gorgias.io/api/1/',
        websiteUrl: 'https://www.gorgiastemplates.com',
        functionsUrl: 'https://app.gorgiastemplates.com'
    });
}

export default Config;
