var Config = {
    baseURL: 'http://localhost:5555/',
    apiBaseURL: 'http://localhost:5555/api/1/',
    firebaseSignupUrl: 'http://localhost:4000/signup/',

    plans: {
        usd: [
            {
                sku: 'startup-monthly-usd-1',
                currency_sign: '$',
                name: 'Startup Monthly',
                cents: 0,
                interval: 'month',
                currency: 'usd',
                amount: 5,
                tens: 5
            },
            {
                sku: 'startup-yearly-usd-1',
                currency_sign: '$',
                name: 'Startup Yearly',
                cents: 16,
                interval: 'year',
                currency: 'usd',
                amount: 50,
                tens: 4
            }
        ]
    },
    stripeKey: 'pk_test_CrndKgX0RqZNr0zdvWibYUMC'
};

if (ENV === 'production') {
    Config = {
        baseURL: 'https://chrome.gorgias.io/',
        apiBaseURL: 'https://chrome.gorgias.io/api/1/',
        firebaseSignupUrl: 'https://templates.gorgias.io/signup/'
    };
};
