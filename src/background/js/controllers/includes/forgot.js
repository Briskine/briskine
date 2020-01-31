import store from '../../../../store/store-client';

export default function ForgotCtrl ($timeout) {
    'ngInject';
    var self = this;
    self.loading = false;

    self.credentials = {
        email: ''
    };

    self.error = null;

    self.submit = function () {
        self.loading = true;
        store.forgot(self.credentials)
        .then(function success() {
            self.error = null;
            $('#forgot-modal').modal('hide');
            return;
        })
        .catch(function error(response) {
            $timeout(() => {
                if (response && response.error) {
                    self.error = response.error;
                } else {
                    self.error = 'Could not connect to password recovery server. Please try disabling your firewall or antivirus software and try again.';
                }
                $('#forgot-error').alert();
            });
            return;
        })
        .then(() => {
            self.loading = false;
        });
    };
}
