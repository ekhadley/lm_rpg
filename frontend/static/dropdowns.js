import {
    createSystemSelectCustom, createSystemSelectDropdown, createSystemSelect,
    createModelSelectCustom, createModelSelectDropdown, createModelSelect,
    selectStorySystemSelectCustom, selectStorySystemSelectDropdown, selectStorySystemSelect,
    selectStoryModelSelectCustom, selectStoryModelSelectDropdown, selectStoryModelSelect,
    copyStoryModelSelectCustom, copyStoryModelSelectDropdown, copyStoryModelSelect,
    cacheModeSelectCustom, cacheModeSelectDropdown, cacheModeSelect,
} from './state.js';

export function initCustomDropdown(customSelect, dropdown, nativeSelect) {
    if (!customSelect || !dropdown || !nativeSelect) return;

    const valueSpan = customSelect.querySelector('.custom-select-value');
    let isOpen = false;

    // Initialize selected value
    const selectedOption = dropdown.querySelector('.custom-select-option[data-selected="true"]');
    if (selectedOption) {
        valueSpan.textContent = selectedOption.textContent;
        selectedOption.classList.add('selected');
        nativeSelect.value = selectedOption.dataset.value;
    } else {
        const firstOption = dropdown.querySelector('.custom-select-option');
        if (firstOption) {
            valueSpan.textContent = firstOption.textContent;
            firstOption.classList.add('selected');
            nativeSelect.value = firstOption.dataset.value;
        }
    }

    function openDropdown() {
        if (nativeSelect.disabled) return;
        isOpen = true;
        customSelect.classList.add('active');
        dropdown.classList.add('show');
    }

    function closeDropdown() {
        isOpen = false;
        customSelect.classList.remove('active');
        dropdown.classList.remove('show');
    }

    // Open on hover; a short close delay lets the cursor cross the gap to the menu without it snapping shut.
    let closeTimer = null;
    const scheduleClose = () => { closeTimer = setTimeout(closeDropdown, 150); };
    const cancelClose = () => { clearTimeout(closeTimer); };

    customSelect.addEventListener('mouseenter', () => { cancelClose(); openDropdown(); });
    customSelect.addEventListener('mouseleave', scheduleClose);
    dropdown.addEventListener('mouseenter', cancelClose);
    dropdown.addEventListener('mouseleave', scheduleClose);

    customSelect.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            isOpen ? closeDropdown() : openDropdown();
        } else if (e.key === 'Escape') {
            closeDropdown();
        }
    });

    dropdown.querySelectorAll('.custom-select-option').forEach(option => {
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.querySelectorAll('.custom-select-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            option.classList.add('selected');
            valueSpan.textContent = option.textContent;
            nativeSelect.value = option.dataset.value;
            nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
            closeDropdown();
        });
    });

    nativeSelect.addEventListener('change', () => {
        const selectedValue = nativeSelect.value;
        const option = dropdown.querySelector(`.custom-select-option[data-value="${selectedValue}"]`);
        if (option) {
            dropdown.querySelectorAll('.custom-select-option').forEach(opt => {
                opt.classList.remove('selected');
            });
            option.classList.add('selected');
            valueSpan.textContent = option.textContent;
        }
    });

    document.addEventListener('click', (e) => {
        if (!customSelect.contains(e.target) && !dropdown.contains(e.target)) {
            closeDropdown();
        }
    });

    function updateDisabledState() {
        if (nativeSelect.disabled) {
            customSelect.classList.add('disabled');
        } else {
            customSelect.classList.remove('disabled');
        }
    }

    const observer = new MutationObserver(updateDisabledState);
    observer.observe(nativeSelect, { attributes: true, attributeFilter: ['disabled'] });
    updateDisabledState();
}

export function initAllDropdowns() {
    if (createSystemSelectCustom && createSystemSelectDropdown && createSystemSelect) {
        initCustomDropdown(createSystemSelectCustom, createSystemSelectDropdown, createSystemSelect);
    }
    if (createModelSelectCustom && createModelSelectDropdown && createModelSelect) {
        initCustomDropdown(createModelSelectCustom, createModelSelectDropdown, createModelSelect);
    }
    if (selectStorySystemSelectCustom && selectStorySystemSelectDropdown && selectStorySystemSelect) {
        initCustomDropdown(selectStorySystemSelectCustom, selectStorySystemSelectDropdown, selectStorySystemSelect);
    }
    if (selectStoryModelSelectCustom && selectStoryModelSelectDropdown && selectStoryModelSelect) {
        initCustomDropdown(selectStoryModelSelectCustom, selectStoryModelSelectDropdown, selectStoryModelSelect);
    }
    if (copyStoryModelSelectCustom && copyStoryModelSelectDropdown && copyStoryModelSelect) {
        initCustomDropdown(copyStoryModelSelectCustom, copyStoryModelSelectDropdown, copyStoryModelSelect);
    }
    if (cacheModeSelectCustom && cacheModeSelectDropdown && cacheModeSelect) {
        initCustomDropdown(cacheModeSelectCustom, cacheModeSelectDropdown, cacheModeSelect);
    }
}
