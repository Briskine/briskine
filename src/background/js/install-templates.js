gqApp.service('InstallService', function () {
    this.templates = function () {
        return {
            'greetings': {
                'label': 'Greetings',
                'desc': 'Use these to start a conversation',
                'templates': [
                    {
                        'en': {
                            'title': 'Say Hello',
                            'shortcut': 'h',
                            'tags': 'en, greetings',
                            'body': 'Hello {{to.0.first_name}},\n\n'
                        }
                    },
                    {
                        'en': {
                            'title': 'Say Hi',
                            'shortcut': 'hi',
                            'tags': 'en, greetings',
                            'body': 'Hello {{to.0.first_name}},\n\n'
                        }
                    },
                ]
            },
            'gratitude': {
                'label': 'Gratitude',
                'desc': 'A few shortcuts to express your gratitude',
                'templates': [
                    {
                        'en': {
                            'title': 'Thanks a lot',
                            'shortcut': 'thl',
                            'tags': 'en, gratitude',
                            'body': 'Thank you so much - I really appreciate it!'
                        }
                    },

                ]
            },
            'followup': {
                'label': 'Followups',
                'desc': 'A few shortcuts to get some followup',
                'templates': [
                    {
                        'en': {
                            'title': 'Nice talking to you',
                            'shortcut': 'nic',
                            'tags': 'en, followup',
                            'body': 'It was nice talking to you. Thank you for your time - I really appreciate it!'
                        }
                    },
                    {
                        'en': {
                            'title': 'Pleasure',
                            'shortcut': 'plr',
                            'tags': 'en, followup',
                            'body': 'It was a pleasure speaking with you earlier.'
                        }
                    }
                ]
            },
            'closing': {
                'label': "Closing lines",
                'desc': "Use these to close a message. Ex: Kind regards, Anne.",
                'templates': [
                    {
                        'en': {
                            'title': 'Kind Regards',
                            'shortcut': 'kr',
                            'tags': 'en, closing',
                            'body': 'Kind regards,\n{{from.0.first_name}}.'
                        }
                    },
                    {
                        'en': {
                            'title': 'Best Regards',
                            'shortcut': 'br',
                            'tags': 'en, closing',
                            'body': 'Best regards,\n{{from.0.first_name}}.'
                        }
                    },
                ]
            }
        };
    };
});
