gApp.service('InstallService', function () {

    // available languages
    this.languages = [
        {
            iso: 'zh',
            label: '官话',
            enabled: false
        },
        {
            iso: 'en',
            label: 'English',
            enabled: false
        },
        {
            iso: 'fr',
            label: 'Français',
            enabled: false
        },
        {
            iso: 'de',
            label: 'Deutsch',
            enabled: false
        },
        /* TODO(alex): No spanish for now... Next version!
         {
         iso: 'es',
         label: 'Spanish',
         enabled: false
         }
         */
    ];

    for (var i in navigator.languages) {
        var iso = navigator.languages[i];
        for (var j in this.languages) {
            if (this.languages[j].iso.indexOf(iso) === 0) {
                this.languages[j].enabled = true;
            }
        }
    }

    // these are installed templates by default
    this.preloadedTemplates = [
        {
            'title': 'Say Hello',
            'shortcut': 'h',
            'subject': '',
            'tags': 'en, greetings',
            'body': 'Hello {{to.0.first_name}},\n\n'
        },
        {
            'title': 'Nice talking to you',
            'shortcut': 'nic',
            'subject': '',
            'tags': 'en, followup',
            'body': 'It was nice talking to you.'
        },
        {
            'title': 'Kind Regards',
            'shortcut': 'kr',
            'subject': '',
            'tags': 'en, closing',
            'body': 'Kind regards,\n{{from.0.first_name}}.'
        },
        {
            'title': 'My email',
            'shortcut': 'e',
            'subject': '',
            'tags': 'en, personal',
            'body': '{{from.0.email}}'
        }
    ];

    this.templates = [
        {
            'id': 'greetings',
            'label': "Greetings",
            'desc': 'Phrases used to start off a conversation',
            'enabled': true,
            'templates': [
                [
                    {
                        'iso': 'en',
                        'title': 'Say Hello',
                        'shortcut': 'h',
                        'subject': '',
                        'tags': 'en, greetings',
                        'body': 'Hello {{to.0.first_name}},\n\n',
                        'enabled': true
                    },
                    {
                        'iso': 'fr',
                        'title': 'Bonjour',
                        'shortcut': 'b',
                        'subject': '',
                        'tags': 'fr, greetings',
                        'body': 'Bonjour {{to.0.first_name}},\n\n',
                        'enabled': true
                    },
                    {
                        'iso': 'es',
                        'title': 'Hola',
                        'shortcut': 'ho',
                        'subject': '',
                        'tags': 'es, greetings',
                        'body': 'Hola {{to.0.first_name}},\n\n',
                        'enabled': true
                    },
                    {
                        'iso': 'de',
                        'title': 'Hallo',
                        'shortcut': 'ha',
                        'subject': '',
                        'tags': 'de, greetings',
                        'body': 'Hallo {{to.0.first_name}},\n\n',
                        'enabled': true
                    },
                    {
                        'iso': 'zh',
                        'title': '您好',
                        'shortcut': '',
                        'subject': '',
                        'tags': 'zh, greetings',
                        'body': '您好{{to.0.first_name}},\n\n',
                        'enabled': true
                    },
                ],
                [
                    {
                        'iso': 'en',
                        'title': 'Say Hi',
                        'shortcut': 'hi',
                        'subject': '',
                        'tags': 'en, greetings',
                        'body': 'Hi {{to.0.first_name}},\n\n',
                        'enabled': false
                    },
                    {
                        'iso': 'fr',
                        'title': 'Salut',
                        'shortcut': 'sa',
                        'subject': '',
                        'tags': 'fr, greetings',
                        'body': 'Salut {{to.0.first_name}},\n\n',
                        'enabled': false
                    },
                ],
            ]
        },
        {
            'id': 'intro',
            'label': 'Introductory phrases',
            'desc': "When you write to someone that doesn't know you yet it's nice to explain why you're writing to them",
            'enabled': false,
            'templates': [
                [
                    {
                        'iso': 'en',
                        'title': 'On behalf of',
                        'shortcut': '',
                        'subject': '',
                        'tags': 'en, intro',
                        'body': 'I am writing to you on behalf of',
                        'enabled': false
                    },
                    {
                        'iso': 'de',
                        'title': 'Ich schreibe Ihnen im Namen von... ',
                        'shortcut': '',
                        'subject': '',
                        'tags': 'de, intro',
                        'body': 'Ich schreibe Ihnen im Namen von ',
                        'enabled': false
                    },
                    {
                        'iso': 'fr',
                        'title': 'De la part de ...',
                        'shortcut': '',
                        'subject': '',
                        'tags': 'fr, intro',
                        'body': 'Je vous écris de la part de ',
                        'enabled': false
                    },
                ],
                [
                    {
                        'iso': 'en',
                        'title': 'Highly recommended',
                        'shortcut': '',
                        'subject': '',
                        'tags': 'en, intro',
                        'body': 'You were highly recommended by ',
                        'enabled': false
                    },
                    {
                        'iso': 'de',
                        'title': 'Sie wurden äußerst von ... empfohlen',
                        'shortcut': '',
                        'subject': '',
                        'tags': 'de, intro',
                        'body': 'Sie wurden äußerst von {{cursor}} empfohlen',
                        'enabled': false
                    },
                    {
                        'iso': 'fr',
                        'title': "Recommandé par ...",
                        'shortcut': '',
                        'subject': '',
                        'tags': 'fr, intro',
                        'body': "Vous m'avez été particulièrement recommandé par ",
                        'enabled': false
                    },
                ],
            ]
        },
        {
            'id': 'gratitude',
            'label': 'Gratitude expressions',
            'desc': 'A few shortcuts to express your gratitude',
            'enabled': false,
            'templates': [
                [
                    {
                        'iso': 'en',
                        'title': 'Thanks a lot',
                        'shortcut': 'thl',
                        'subject': '',
                        'tags': 'en, gratitude',
                        'body': 'Thank you so much - I really appreciate it!',
                        'enabled': false
                    },
                    {
                        'iso': 'zh',
                        'title': '非常感谢！',
                        'shortcut': '',
                        'subject': '',
                        'tags': 'zh, gratitude',
                        'body': '非常感谢！',
                        'enabled': false
                    },
                    {
                        'iso': 'de',
                        'title': 'Vielen Dank',
                        'shortcut': '',
                        'subject': '',
                        'tags': 'de, gratitude',
                        'body': 'Vielen Dank - Das weiß ich zu schätzen!',
                        'enabled': false
                    },
                    {
                        'iso': 'fr',
                        'title': "Merci beaucoup",
                        'shortcut': '',
                        'subject': '',
                        'tags': 'fr, gratitude',
                        'body': "Merci beaucoup, c'est très gentil de votre part !",
                        'enabled': false
                    },
                ],
                [
                    {
                        'iso': 'en',
                        'title': 'Thank you in advance for your help.',
                        'shortcut': '',
                        'subject': '',
                        'tags': 'en, gratitude',
                        'body': 'Thank you in advance for your help.',
                        'enabled': false
                    },
                    {
                        'iso': 'zh',
                        'title': '提前感谢您的帮助。',
                        'shortcut': '',
                        'subject': '',
                        'tags': 'zh, gratitude',
                        'body': '提前感谢您的帮助。',
                        'enabled': false
                    },
                    {
                        'iso': 'de',
                        'title': 'Vielen Dank vorab für Ihre Hilfe.',
                        'shortcut': '',
                        'subject': '',
                        'tags': 'de, gratitude',
                        'body': 'Vielen Dank vorab für Ihre Hilfe.',
                        'enabled': false
                    },
                    {
                        'iso': 'fr',
                        'title': "Merci d'avance",
                        'shortcut': '',
                        'subject': '',
                        'tags': 'fr, gratitude',
                        'body': 'Je vous remercie par avance pour votre aide.',
                        'enabled': false
                    },
                ]
            ]
        },
        {
            'id': 'followup',
            'label': 'Followups',
            'desc': 'Had a meeting/call with somebody? Add a followup message.',
            'enabled': false,
            'templates': [
                [
                    {
                        'iso': 'en',
                        'title': 'Nice talking to you',
                        'shortcut': 'nic',
                        'subject': '',
                        'tags': 'en, followup',
                        'body': 'It was nice talking to you.',
                        'enabled': false
                    },
                    {
                        'iso': 'zh',
                        'title': '与您的交流很愉快。',
                        'shortcut': '',
                        'subject': '',
                        'tags': 'zh, followup',
                        'body': '与您的交流很愉快。',
                        'enabled': false
                    },
                    {
                        'iso': 'de',
                        'title': 'Es war sehr schön, mit Ihnen gesprochen zu haben.',
                        'shortcut': '',
                        'subject': '',
                        'tags': 'de, followup',
                        'body': 'Es war sehr schön, mit Ihnen gesprochen zu haben.',
                        'enabled': false
                    },
                    {
                        'iso': 'fr',
                        'title': "Ravi(e) d'avoir pu discuter",
                        'shortcut': '',
                        'subject': '',
                        'tags': 'fr, followup',
                        'body': "Je suis ravi(e) d'avoir pu discuter avec vous.",
                        'enabled': false
                    },
                ],
                [
                    {
                        'iso': 'en',
                        'title': 'A pleasure',
                        'shortcut': 'plr',
                        'subject': '',
                        'tags': 'en, followup',
                        'body': 'It was a pleasure speaking with you earlier.',
                        'enabled': false
                    },
                    {
                        'iso': 'zh',
                        'title': '之前与您的谈话很愉快。',
                        'shortcut': '',
                        'subject': '',
                        'tags': 'zh, followup',
                        'body': '之前与您的谈话很愉快。',
                        'enabled': false
                    },
                    {
                        'iso': 'de',
                        'title': 'Es war mir eine Freude, Sie gesprochen zu haben.',
                        'shortcut': '',
                        'subject': '',
                        'tags': 'de, followup',
                        'body': 'Es war mir eine Freude, Sie gesprochen zu haben.',
                        'enabled': false
                    },
                    {
                        'iso': 'fr',
                        'title': "Ce fut un plaisir de m'entretenir avec vous.",
                        'shortcut': '',
                        'subject': '',
                        'tags': 'fr, followup',
                        'body': "Ce fut un plaisir de m'entretenir avec vous.",
                        'enabled': false
                    },
                ]
            ]
        },
        {
            'id': 'negative',
            'label': "Negative responses",
            'desc': "Sometimes you have to refuse/reject people's requests. You gotta do what you gotta do...",
            'enabled': false,
            'templates': [
                [
                    {
                        'iso': 'en',
                        'title': "We carefully considered ...",
                        'shortcut': '',
                        'subject': '',
                        'tags': 'en, negative',
                        'body': "We carefully considered your request and we're sorry to inform you that ",
                        'enabled': false
                    },
                    {
                        'iso': 'de',
                        'title': "Wir haben Ihre Anfrage ...",
                        'shortcut': '',
                        'subject': '',
                        'tags': 'de, negative',
                        'body': "Wir haben Ihre Anfrage sorgfältig gesichtigt, müssen Ihnen jedoch leider mitteilen, daß ",
                        'enabled': false
                    },
                    {
                        'iso': 'fr',
                        'title': "Nous avons pris en compte votre demande mais ...",
                        'shortcut': '',
                        'subject': '',
                        'tags': 'fr, negative',
                        'body': "Nous avons pris en compte votre demande avec attention mais nous avons le regret de vous informer que ",
                        'enabled': false
                    },
                ],
                [
                    {
                        'iso': 'en',
                        'title': 'We are sorry to inform you that ...',
                        'shortcut': '',
                        'subject': '',
                        'tags': 'en, negative',
                        'body': 'We are sorry to inform you that ',
                        'enabled': false
                    },
                    {
                        'iso': 'de',
                        'title': 'Es tut uns leid, Ihnen mitteilen zu müssen, daß ...',
                        'shortcut': '',
                        'subject': '',
                        'tags': 'de, negative',
                        'body': 'Es tut uns leid, Ihnen mitteilen zu müssen, daß ',
                        'enabled': false
                    },
                    {
                        'iso': 'fr',
                        'title': "Nous avons le regret de vous informer ...",
                        'shortcut': '',
                        'subject': '',
                        'tags': 'fr, negative',
                        'body': "Nous avons le regret de vous informer que",
                        'enabled': false
                    },
                ],
            ]
        },
        {
            'id': 'phrases',
            'label': 'Phrases',
            'desc': 'A bunch of frequently encountered phrases',
            'templates': [
                [
                    {
                        'iso': 'en',
                        'title': 'If you could ...',
                        'shortcut': '',
                        'subject': '',
                        'tags': 'en, phrases',
                        'body': 'I would be grateful if you could ',
                        'enabled': false
                    },
                    {
                        'iso': 'de',
                        'title': 'Es wäre klasse, wenn Sie...',
                        'shortcut': '',
                        'subject': '',
                        'tags': 'de, phrases',
                        'body': 'Es wäre klasse, wenn Sie ',
                        'enabled': false
                    },
                    {
                        'iso': 'fr',
                        'title': 'Pourriez-vous ...',
                        'shortcut': '',
                        'subject': '',
                        'tags': 'fr, phrases',
                        'body': 'Pourriez-vous',
                        'enabled': false
                    },
                ],
                [
                    {
                        'iso': 'en',
                        'title': 'Attached document',
                        'shortcut': 'att',
                        'subject': '',
                        'tags': 'en, phrases',
                        'body': 'Please find the document attached to this e-mail.',
                        'enabled': false
                    },
                    {
                        'iso': 'de',
                        'title': 'Bitte entnehmen Sie das Dokument dem Anhang.',
                        'shortcut': '',
                        'subject': '',
                        'tags': 'de, phrases',
                        'body': 'Bitte entnehmen Sie das Dokument dem Anhang.',
                        'enabled': false
                    },
                    {
                        'iso': 'zh',
                        'title': '请查收附件。',
                        'shortcut': '',
                        'subject': '',
                        'tags': 'zh, phrases',
                        'body': '请查收附件。',
                        'enabled': false
                    },
                    {
                        'iso': 'fr',
                        'title': 'Veuillez trouver le document ci-joint. ',
                        'shortcut': '',
                        'subject': '',
                        'tags': 'fr, phrases',
                        'body': 'Veuillez trouver le document ci-joint.',
                        'enabled': false
                    },
                ],
            ]
        },
        {
            'id': 'closing',
            'label': "Closing lines",
            'desc': "Closing a message is just as important as starting one!",
            'enabled': false,
            'templates': [
                [
                    {
                        'iso': 'en',
                        'title': 'Kind Regards',
                        'shortcut': 'kr',
                        'subject': '',
                        'tags': 'en, closing',
                        'body': 'Kind regards,\n{{from.0.first_name}}.',
                        'enabled': false
                    },
                    {
                        'iso': 'zh',
                        'title': '祝好',
                        'shortcut': '',
                        'subject': '',
                        'tags': 'en, closing',
                        'body': '祝好，\n{{from.0.first_name}}.',
                        'enabled': false
                    },
                    {
                        'iso': 'de',
                        'title': 'Mit freundlichen Grüßen',
                        'shortcut': '',
                        'subject': '',
                        'tags': 'de, closing',
                        'body': 'Mit freundlichen Grüßen,\n{{from.0.first_name}}.',
                        'enabled': false
                    },
                    {
                        'iso': 'fr',
                        'title': 'Bien à vous',
                        'shortcut': '',
                        'subject': '',
                        'tags': 'fr, closing',
                        'body': 'Bien à vous,\n{{from.0.first_name}}.',
                        'enabled': false
                    },
                ],
                [
                    {
                        'iso': 'en',
                        'title': 'Best Regards',
                        'shortcut': 'br',
                        'subject': '',
                        'tags': 'en, closing',
                        'body': 'Best regards,\n{{from.0.first_name}}.',
                        'enabled': false
                    },
                    {
                        'iso': 'de',
                        'title': 'Beste Grüße',
                        'shortcut': '',
                        'subject': '',
                        'tags': 'de, closing',
                        'body': 'Beste Grüße,\n{{from.0.first_name}}.',
                        'enabled': false
                    },
                    {
                        'iso': 'fr',
                        'title': 'Bien cordialement',
                        'shortcut': '',
                        'subject': '',
                        'tags': 'fr, closing',
                        'body': 'Bien cordialement,\n{{from.0.first_name}}.',
                        'enabled': false
                    },
                ],
                [
                    {
                        'iso': 'en',
                        'title': 'If you need help...',
                        'shortcut': '',
                        'subject': '',
                        'tags': 'en, closing',
                        'body': 'If you need any help please let me know.',
                        'enabled': false
                    },
                    {
                        'iso': 'de',
                        'title': 'Insofern Sie Hilfe benötigen, melden Sie sich bitte bei mir.',
                        'shortcut': '',
                        'subject': '',
                        'tags': 'de, closing',
                        'body': 'Insofern Sie Hilfe benötigen, melden Sie sich bitte bei mir.',
                        'enabled': false
                    },
                    {
                        'iso': 'zh',
                        'title': '如果您需要任何帮助，请随时告知我。',
                        'shortcut': '',
                        'subject': '',
                        'tags': 'zh, closing',
                        'body': '如果您需要任何帮助，请随时告知我。',
                        'enabled': false
                    },
                    {
                        'iso': 'fr',
                        'title': "Si vous avez besoin d'aide, n'hésitez pas à me contacter à nouveau.",
                        'shortcut': '',
                        'subject': '',
                        'tags': 'fr, closing',
                        'body': "Si vous avez besoin d'aide, n'hésitez pas à me contacter à nouveau.",
                        'enabled': false
                    },
                ],
                [
                    {
                        'iso': 'en',
                        'title': 'More info',
                        'shortcut': '',
                        'subject': '',
                        'tags': 'en, closing',
                        'body': 'If you require more information please let me know.',
                        'enabled': false
                    },
                    {
                        'iso': 'de',
                        'title': 'Möchten Sie weitere Informationen erhalten, geben Sie mir bitte bescheid.',
                        'shortcut': '',
                        'subject': '',
                        'tags': 'de, closing',
                        'body': 'Möchten Sie weitere Informationen erhalten, geben Sie mir bitte bescheid.',
                        'enabled': false
                    },
                    {
                        'iso': 'zh',
                        'title': '如果您需要更多信息，请随时告知我。',
                        'shortcut': '',
                        'subject': '',
                        'tags': 'zh, closing',
                        'body': '如果您需要更多信息，请随时告知我。',
                        'enabled': false
                    },
                    {
                        'iso': 'fr',
                        'title': "Si vous avez besoin de davantage d'informations, n'hésitez pas à m'en faire part.",
                        'shortcut': '',
                        'subject': '',
                        'tags': 'fr, closing',
                        'body': "Si vous avez besoin de davantage d'informations, n'hésitez pas à m'en faire part.",
                        'enabled': false
                    },
                ],
                [
                    {
                        'iso': 'en',
                        'title': 'Look forward',
                        'shortcut': '',
                        'subject': '',
                        'tags': 'en, closing',
                        'body': 'I look forward to hearing from you soon.',
                        'enabled': false
                    },
                    {
                        'iso': 'de',
                        'title': 'Ich freue mich, von Ihnen zu hören.',
                        'shortcut': '',
                        'subject': '',
                        'tags': 'de, closing',
                        'body': 'Ich freue mich, von Ihnen zu hören.',
                        'enabled': false
                    },
                    {
                        'iso': 'zh',
                        'title': 'Ich freue mich, von Ihnen zu hören.',
                        'shortcut': '',
                        'subject': '',
                        'tags': 'zh, closing',
                        'body': '期待您的回复。',
                        'enabled': false
                    },
                    {
                        'iso': 'fr',
                        'title': "Dans l'attente d'avoir de vos nouvelles",
                        'shortcut': '',
                        'subject': '',
                        'tags': 'fr, closing',
                        'body': "Dans l'attente d'avoir de vos nouvelles",
                        'enabled': false
                    },
                ],
            ]
        }
    ];
});
