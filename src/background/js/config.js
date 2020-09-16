/* globals ENV */
var Config = {
    websiteUrl: 'http://localhost:4000',
    functionsUrl: 'http://localhost:5000',
    helpUrl: 'https://help.gorgiastemplates.com',
    dashboardTarget: 'gt-dashboard'
};

// firebase staging
if (ENV === 'staging') {
    Config = Object.assign(Config, {
        functionsUrl: 'https://staging.gorgiastemplates.com'
    });
}

if (ENV === 'production') {
    Config = Object.assign(Config, {
        websiteUrl: 'https://www.gorgiastemplates.com',
        functionsUrl: 'https://app.gorgiastemplates.com'
    });
}

export default Config;
