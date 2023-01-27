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

  #createDialogStyle() {
    // This ensures the modal is placed nicely fit with the properties sidebar.
    // TODO: Add responsiveness on resize.
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
   * @param {MetaItem} item
   * @returns {string}
   */
  static #createCheckboxControl(item) {
    return `
            <div class="form-check">
                <input class="form-check-input" type="checkbox" value="" id="${item.label.toLowerCase()}_input" name="${item.label.toLowerCase()}_input">
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
            id="add_tradition_form"
            class="needs-validation"
            novalidate=""
            >
            ${metaItems.map(this.renderFormControl).join('\n')}
            </form>
        `;
    StemmawebDialog.show(
      'Edit properties',
      modal_body,
      {},
      { elemStyle: this.#createDialogStyle() }
    );
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
