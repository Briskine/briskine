var Config = {
    baseURL: "http://localhost:5555/",
    apiBaseURL: "http://localhost:5555/api/1/",
};

if (ENV === 'production') {
    Config = {
        baseURL: "https://chrome.gorgias.io/",
        apiBaseURL: "https://chrome.gorgias.io/api/1/"
    };
};
