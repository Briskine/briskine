import $ from 'jquery';

export default {
    bindings: {
        freeLimit: '<',
        reachedFreeLimit: '&',
        openUpgrade: '&'
    },
    controller: function SubscriptionHint () {
        const ctrl = this;

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
            ng-if="$ctrl.reachedFreeLimit()"
        >
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
    `
};
