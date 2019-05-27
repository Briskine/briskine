var Config = {
    baseURL: 'http://localhost:5555/',
    apiBaseURL: 'http://localhost:5555/api/1/',
    firebaseSignupUrl: 'http://localhost:4000/signup/'
};

if (ENV === 'production') {
    Config = {
        baseURL: 'https://chrome.gorgias.io/',
        apiBaseURL: 'https://chrome.gorgias.io/api/1/',
        firebaseSignupUrl: 'https://templates.gorgias.io/signup/'
    };
};
