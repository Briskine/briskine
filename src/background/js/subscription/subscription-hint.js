import $ from 'jquery';

import Config from '../config';

export default {
    bindings: {
        freeLimit: '<',
        showAuthWarning: '&',
        reachedFreeLimit: '&',
        openUpgrade: '&'
    },
    controller: function SubscriptionHint () {
        const ctrl = this;

        ctrl.signupUrl = `${Config.websiteUrl}/signup`;

        ctrl.showHint = function () {
            return ctrl.reachedFreeLimit() || ctrl.showAuthWarning();
        };

        ctrl.upgrade = function () {
            // HACK
            // if we redirect from the new template dialog,
            // close all modals.
            $('.modal').modal('hide');

            ctrl.openUpgrade();
        };
    },
    template: `
        <div
            class="alert alert-warning"
            ng-if="$ctrl.showHint()"
        >
            <div ng-if="$ctrl.showAuthWarning()">
                <p>
                    Please
                    <a
                        href
                        data-toggle="modal"
                        data-target="#signin-modal"
                    >
                        log in
                    </a>
                    or
                    <a href="{{$ctrl.signupUrl}}" target="_blank">create a free account</a>
                    to avoid losing your templates.
                </p>

                <p>
                    Your templates are only saved on your computer right now. If you re-install Chrome you will lose your templates.
                </p>
            </div>

            <div ng-if="$ctrl.reachedFreeLimit()">
                <p>
                    You've reached the
                    <strong>
                        {{$ctrl.freeLimit}}
                    </strong>
                    template limit of the
                    <strong>
                        Free
                    </strong>
                    plan.
                </p>
                <p>
                    <a
                        href
                        ng-click="$ctrl.upgrade()"
                    >
                        Upgrade to the Premium plan
                    </a>
                    to get unlimited templates and team collaboration features.
                </p>
            </div>
        </div>
    `
};
