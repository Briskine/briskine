/*
 * Support for the data-gorgias-search attribute.
 * Setting the attribute on the editable element will set it's value in the dialog search.
 */

const dialogShowClass = 'qa-btn-dropdown-show';
const searchSelector = '.qt-dropdown-search';

function setDialogSearch (value = '') {
    const $search = document.querySelector(searchSelector);
    if ($search) {
        $search.value = value;
        $search.dispatchEvent(new Event('keyup', {bubbles: true}));
    }
}

export default function enableDialogSearchAttr () {
    const observer = new MutationObserver(() => {
        if (!document.activeElement) {
            return;
        }

        const search = document.activeElement.dataset.gorgiasSearch;
        if (search && document.body.classList.contains(dialogShowClass)) {
            setDialogSearch(search);
        }
    });

    observer.observe(document.body, {
        attributes: true
    });
}
