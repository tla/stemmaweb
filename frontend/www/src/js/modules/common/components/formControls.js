class FormControlFactory {

    constructor() {
    }
    
    /** @type {{checkbox: function(MetaItem): string, text: function(MetaItem): string, dropdown: function(MetaItem): string}} */
    static #formControlMap = {
        text: FormControlFactory.#createTextControl,
        dropdown: FormControlFactory.#createDropdownControl,
        checkbox: FormControlFactory.#createCheckboxControl
    };
    
    /**
     * @param {MetaItem} item
     * @returns {string}
     */
    renderFormControl(item) {
        return item.inputOptions
            ? FormControlFactory.#formControlMap[item.inputOptions.control](item)
            : '';
    }

    /**
     * Creates and returns the HTML for a text field form control.
     *
     * @param {MetaItem} item
     * @returns {string}
     */
    static #createTextControl(item) {
        const invalidFeedback = `
            <div class="invalid-feedback">
                Input for this field is required for the tradition.
            </div>
        `;
        return `
            <label 
                for="${FormControlFactory.#toHtmlId( item.label )}_input"
                id="edit_property_${FormControlFactory.#toHtmlId( item.label )}_field"
                class="form-label"
            >
                ${FormControlFactory.#createLabel(item)}
            </label>
            <div class="form-textfield">
                <input
                    id="${FormControlFactory.#toHtmlId( item.label )}_input"
                    type="text"
                    name="${FormControlFactory.#toHtmlId( item.label )}_input"
                    value="${item.value}"
                    class="form-control ${item.inputOptions.required ? 'has-validation' : ''}"
                    ${
                        item.inputOptions.size
                        ? 'size="' + item.inputOptions.size + '"'
                        : ''
                    }
                    ${item.inputOptions.required ? 'required=""' : ''}
                />
                ${item.inputOptions.required ? invalidFeedback : ''}
            </div>
        `;
    }

    /**
     * @param {MetaItem} item
     * @returns {string}
     */
    static #createLabel(item) {
        return item.inputOptions.label ? item.inputOptions.label : item.label;
    }

    /**
     * @param {string} label
     * @returns {string}
     */
    static #toHtmlId(label) {
        return label.toLowerCase().replaceAll(' ','-');
    }

    static #createSelectOption(option, selectedValue) {
        const selected = option.value == selectedValue ? ' selected' : '';
        return `
            <option value="${option.value}"${selected}>
                ${option.display}
            </option>
        `;
    }

    /**
     * Creates and returns the HTML for a drop down selection form control.
     *
     * @param {MetaItem} item
     * @returns {string}
     */
    static #createDropdownControl(item) {
        return `
            <label
                for="${FormControlFactory.#toHtmlId( item.label )}_input"
                id="edit_property_${FormControlFactory.#toHtmlId( item.label )}_field"
                class="form-label"
            >
            ${FormControlFactory.#createLabel(item)}
            </label>
            <select
                id="${FormControlFactory.#toHtmlId( item.label )}_input"
                name="${FormControlFactory.#toHtmlId( item.label )}_input"
                class="form-select"
            >
            ${ item.inputOptions.selectOptions.map( function (option) {
                return FormControlFactory.#createSelectOption(option, item.inputOptions.selected);
                } ).join('\n') }
            </select>
        `;
    }  

    /**
     * Creates and returns the HTML for a checkbox form control.
     *
     * @param {MetaItem} item
     * @returns {string}
     */
    static #createCheckboxControl(item) {
        return `
            <div class="form-check">
                <input class="form-check-input" type="checkbox" ${
                  item.inputOptions.checked ? 'checked ' : ''
                }value="${item.label.toLowerCase()}" id="${FormControlFactory.#toHtmlId( item.label )}_input" name="${FormControlFactory.#toHtmlId( item.label )}_input">
                <label
                    for="${FormControlFactory.#toHtmlId( item.label )}_input"
                    id="edit_property_${FormControlFactory.#toHtmlId( item.label )}_field"
                    class="form-label"
                >
                ${FormControlFactory.#createLabel(item)}
                </label>
            </div>
        `;
    }

}

const formControlFactory = new FormControlFactory();