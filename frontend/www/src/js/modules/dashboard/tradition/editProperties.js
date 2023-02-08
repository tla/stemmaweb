/** @typedef {import('@types/stemmaweb').BaseResponse} BaseResponse */

/**
 * Object to interact with the Stemmarest Middleware's API through high-level
 * functions.
 *
 * @type {StemmarestService}
 */
const editPropertiesService = stemmarestService;

class EditProperties extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('click', this.showDialog);
  }

  /** @type {{checkbox: function(MetaItem): string, text: function(MetaItem): string, dropdown: function(MetaItem): string}} */
  static #formControlMap = {
    text: EditProperties.#createTextControl,
    dropdown: EditProperties.#createDropdownControl,
    checkbox: EditProperties.#createCheckboxControl
  };

  /**
   * @param {Tradition} tradition Tradition to render the metadata for.
   * @returns {MetaItem[]} Array of metadata items to display on a form.
   */
  static metadataFromTradition(tradition) {
    const metadata = PropertyTableView.metadataFromTradition(tradition);
    metadata.push({
      label: PropertyTableView.traditionMetadataLabels.name,
      value: tradition.name,
      inputOptions: { control: 'text', size: 40, required: true }
    });
    return metadata;
  }

  connectedCallback() {
    this.render();
  }

  /**
   * This helper ensures the modal is placed nicely fit with the properties sidebar.
   * 
   * @todo: Add responsiveness on resize.
   * 
   * @returns {string} String representation of the needed properties of the style attribute. 
   */
  #createDialogStyle() {
    let edit_properties_modal_width = window
      .getComputedStyle($('sidebar_properties'))
      .getPropertyValue('width');
    return (
      'margin-right: 0px; width: ' +
      edit_properties_modal_width +
      '; margin-top: 50px; transform: none;'
    );
  }

  /**
   * @param {MetaItem} item
   * @returns {string}
   */
  static #createLabel(item) {
    return item.inputOptions.label ? item.inputOptions.label : item.label;
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
                for="${item.label.toLowerCase()}_input"
                id="edit_property_${item.label.toLowerCase()}_field"
                class="form-label"
            >
                ${EditProperties.#createLabel(item)}
            </label>
            <input
                id="${item.label.toLowerCase()}_input"
                type="text"
                name="${item.label.toLowerCase()}_input"
                value="${item.value}"
                class="form-control ${
                  item.inputOptions.required ? 'has-validation' : ''
                }"
                ${
                  item.inputOptions.size
                    ? 'size="' + item.inputOptions.size + '"'
                    : ''
                }
                ${item.inputOptions.required ? 'required=""' : ''}
            />
            ${item.inputOptions.required ? invalidFeedback : ''}
            <br />
        `;
  }

  static #createSelectOption(option, selectedValue) {
    const selected = option.value === selectedValue ? 'selected' : '';
    return `
      <option value="${option.value}" ${selected}>
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
                for="${item.label.toLowerCase()}_input"
                id="edit_property_${item.label.toLowerCase()}_field"
                class="form-label"
            >
            ${EditProperties.#createLabel(item)}
            </label>
            <select
                id="${item.label.toLowerCase()}_input"
                name="${item.label.toLowerCase()}_input"
                class="form-select"
            >
                ${item.inputOptions.selectOptions.map(function (option) {
                  return EditProperties.#createSelectOption(option, item.value);
                })}
            </select>
            <br />
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
                <input class="form-check-input" type="checkbox" ${item.inputOptions.checked ? 'checked ' : ''}value="${item.label.toLowerCase()}" id="${item.label.toLowerCase()}_input" name="${item.label.toLowerCase()}_input">
                <label
                    for="${item.label.toLowerCase()}_input"
                    id="edit_property_${item.label.toLowerCase()}_field"
                    class="form-label"
                >
                ${EditProperties.#createLabel(item)}
                </label>
            </div>
            <br />
        `;
  }

  /**
   * @param {MetaItem} item
   * @returns {string}
   */
  renderFormControl(item) {
    return item.inputOptions
      ? EditProperties.#formControlMap[item.inputOptions.control](item)
      : '';
  }

  showDialog() {
    const metaItems = PropertyTableView.sortedMetaItems(
      EditProperties.metadataFromTradition(STEMMA_STORE.state.parentTradition)
    );
    const modal_body = `
            <form
            id="edit-tradition-properties-form"
            class="needs-validation"
            novalidate=""
            >
            ${metaItems.map(this.renderFormControl).join('\n')}
            </form>
        `;
    StemmawebDialog.show(
      'Edit properties',
      modal_body,
      { onOk: this.processForm },
      { 
        okLabel: 'Save', 
        elemStyle: this.#createDialogStyle() 
      }
    );
  }

  /**
  * @returns {{
  *   name: string;
  *   userId: string;
  *   language: string | null;
  *   direction: string;
  *   isPublic: boolean;
  * }}
  */
  static #extractFormValuesTradition() {
   const name = $('name_input').value;
   const userId = AUTH_STORE.state.user ? AUTH_STORE.state.user.id : null;
   const language = $('language_input').value || null;
   const direction = $('direction_input').value;
   const isPublic = $('access_input').checked;
   return { name, userId, language, direction, isPublic };
 }

 /**
  * @returns {Promise}
  */
 processForm() {
  const form = document.querySelector(
    '#edit-tradition-properties-form'
  );
  if (form.checkValidity()) {
    const values = Object.values(
      EditProperties.#extractFormValuesTradition()
    );
    const tradId = TRADITION_STORE.state.selectedTradition.id;
    return editPropertiesService
      .updateTraditionMetadata(tradId, ...values)
      .then( EditProperties.#handleUpdateTraditionMetadataResponse );
  } else {
    form.classList.add('was-validated');
    return Promise.resolve({
      success: false,
      message: 'Form validation error.'
    });
}
}

/** @param {BaseResponse<T>} resp */
 static #handleUpdateTraditionMetadataResponse( resp ) {
    if( resp.success ) {
      StemmawebAlert.show( 'Metadata properties updated.', 'success');
      // @todo: Should the next line be wrapped in a try..catch?
      TRADITION_STORE.updateTradition( resp.data );
      return Promise.resolve({
        success: true,
        message: 'Metadata properties updated.'
      });
    } else {
      StemmawebAlert.show( `Error: ${resp.message}`, 'danger' );
      return Promise.resolve({
        success: false,
        message: resp.message
      });
    }
 }

 /**
   * Set Bootstrap validation and submit handling.
   * We do this now here with method checkform so…
   * @todo: probably remove together with the same in 
   * {@link AddTraditionModal.#initForm()} in `addTradition.js`
   * but that one still needs work.
   * 
   */
  #initForm() {
  }

  render() {
    this.innerHTML = `
            <a
            class="link-secondary"
            href="#"
            aria-label="Edit tradition properties"
            >
                <span>${feather.icons['edit'].toSvg()}</span>
            </a>
        `;
  }
}

customElements.define('edit-properties-button', EditProperties);
