//Include this script to help debug

filepicker.debug = true;

filepicker.error_map = {
    /*General*/
    400: {
        message: "Invalid request to the server - do you need to pass a security policy and signature?",
        moreInfo: 'https://developers.filepicker.io/answers/jsErrors/400'
    },
    403: {
        message: "Not authorized to make this request",
        moreInfo: 'https://developers.filepicker.io/answers/jsErrors/403'
    },
    101: {
        message: 'The user closed the picker without choosing a file',
        moreInfo: 'https://developers.filepicker.io/answers/jsErrors/101'
    },
    111: {
        message: "Your browser doesn't support reading from DOM File objects",
        moreInfo: 'https://developers.filepicker.io/answers/jsErrors/111'
    },
    112: {
        message: "Your browser doesn't support reading from different domains",
        moreInfo: 'https://developers.filepicker.io/answers/jsErrors/112'
    },
    113: {
        message: "The website of the URL you provided does not allow other domains to read data",
        moreInfo: 'https://developers.filepicker.io/answers/jsErrors/113'
    },
    114: {
        message: "The website of the URL you provided had an error",
        moreInfo: 'https://developers.filepicker.io/answers/jsErrors/114'
    },
    115: {
        message: "File not found",
        moreInfo: 'https://developers.filepicker.io/answers/jsErrors/115'
    },
    118: {
        message: "Unknown read error",
        moreInfo: 'https://developers.filepicker.io/answers/jsErrors/118'
    },
    121: {
        message: "The FPFile to write to cannot be found",
        moreInfo: 'https://developers.filepicker.io/answers/jsErrors/121'
    },
    122: {
        message: "The Remote URL could not be reached",
        moreInfo: 'https://developers.filepicker.io/answers/jsErrors/122'
    },
    123: {
        message: "Unknown write error",
        moreInfo: 'https://developers.filepicker.io/answers/jsErrors/123'
    },
    131: {
        message: 'The user closed the dialog without exporting a file',
        moreInfo: 'https://developers.filepicker.io/answers/jsErrors/131'
    },
    141: {
        message: "The FPFile to convert could not be found",
        moreInfo: 'https://developers.filepicker.io/answers/jsErrors/141'
    },
    142: {
        message: "The FPFile could not be converted with the requested parameters",
        moreInfo: 'https://developers.filepicker.io/answers/jsErrors/142'
    },
    143: {
        message: "Unknown error when converting the file",
        moreInfo: 'https://developers.filepicker.io/answers/jsErrors/143'
    },
    151: {
        message: "The file store could not be reached",
        moreInfo: 'https://developers.filepicker.io/answers/jsErrors/151'
    },
    152: {
        message: "The Remote URL could not be reached",
        moreInfo: 'https://developers.filepicker.io/answers/jsErrors/152'
    },
    153: {
        message: "Unknown error when storing",
        moreInfo: 'https://developers.filepicker.io/answers/jsErrors/153'
    },
    161: {
        message: "The file cannot be found",
        moreInfo: 'https://developers.filepicker.io/answers/jsErrors/161'
    },
    162: {
        message: "Error fetching metadata",
        moreInfo: 'https://developers.filepicker.io/answers/jsErrors/162'
    },
    163: {
        message: "Unknown error when fetching metadata",
        moreInfo: 'https://developers.filepicker.io/answers/jsErrors/163'
    },
    171: {
        message: "The file cannot be found, and may have already been deleted",
        moreInfo: 'https://developers.filepicker.io/answers/jsErrors/171'
    },
    172: {
        message: "The underlying content store could not be reached",
        moreInfo: 'https://developers.filepicker.io/answers/jsErrors/172'
    },
    173: {
        message: "Unknown issue when removing",
        moreInfo: 'https://developers.filepicker.io/answers/jsErrors/173'
    }
};
