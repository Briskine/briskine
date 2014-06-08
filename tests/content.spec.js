describe("content_scripts suite", function () {
    it("parseFiels should find the right variables given an e-mail like string", function () {
        // typical example
        expect(GQ.parseFields("Alex P <test@gmail-quicktext.com>")).toEqual({
            'name': 'Alex P',
            'first_name': 'Alex',
            'last_name': 'P',
            'email': 'test@gmail-quicktext.com'
        });
        // multiple names
        expect(GQ.parseFields("Alex Multiple Names 4 <test@gmail-quicktext.com>")).toEqual({
            'name': 'Alex Multiple Names 4',
            'first_name': 'Alex',
            'last_name': 'Multiple Names 4',
            'email': 'test@gmail-quicktext.com'
        });
        // just e-mail
        expect(GQ.parseFields("test@gmail-quicktext.com")).toEqual({
            'name': '',
            'first_name': '',
            'last_name': '',
            'email': 'test@gmail-quicktext.com'
        });
        // e-mail  and some random string
        expect(GQ.parseFields("dsa dsa test@gmail-quicktext.com dada")).toEqual({
            'name': '',
            'first_name': '',
            'last_name': '',
            'email': 'test@gmail-quicktext.com'
        });
        // just a random string doesn't help us much to put the right variables into place
        expect(GQ.parseFields("some random stuff")).toEqual({
            'name': '',
            'first_name': '',
            'last_name': '',
            'email': ''
        });
    });
})
