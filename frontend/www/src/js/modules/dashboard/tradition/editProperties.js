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
   * This helper ensures the modal is placed nicely fit with the properties
   * sidebar.
   *
   * @returns {string} String representation of the needed properties of the
   *   style attribute.
   * @todo: Add responsiveness on resize.
   */
  #createDialogStyle() {
    const width = $('sidebar_properties').getBoundingClientRect().width;
    return (
      `margin-right: 0px; width: ${width}px; margin-top: 50px;`
    );
  }

  showDialog() {
    const metaItems = PropertyTableView.sortedMetaItems(
      EditProperties.metadataFromTradition( STEMMA_STORE.state.tradition )
    );
    const modal_body = `
            <form
            id="edit-tradition-properties-form"
            class="needs-validation"
            novalidate=""
            >
            ${ metaItems.map( formControlFactory.renderFormControl ).join( '\n' ) }
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
    const language = $('language_input').value || null;
    const direction = $('direction_input').value;
    const isPublic = $('access_input').checked;
    return { name, language, direction, isPublic };
  }

  /** @returns {Promise} */
  processForm() {
    const form = document.querySelector('#edit-tradition-properties-form');
    if (form.checkValidity()) {
      const values = Object.values(
        EditProperties.#extractFormValuesTradition()
      );
      const tradId = TRADITION_STORE.state.selectedTradition.id;
      const userId = AUTH_STORE.state.user ? AUTH_STORE.state.user.id : null;
      return editPropertiesService
        .updateTraditionMetadata( userId, tradId, ...values )
        .then(EditProperties.#handleUpdateTraditionMetadataResponse);
    } else {
      form.classList.add('was-validated');
      return Promise.resolve({
        success: false,
        message: 'Form validation error.'
      });
    }
  }

  /** @param {BaseResponse<T>} resp */
  static #handleUpdateTraditionMetadataResponse(resp) {
    if (resp.success) {
      StemmawebAlert.show('Metadata properties updated.', 'success');
      TRADITION_STORE.updateTradition(resp.data);
      return Promise.resolve({
        success: true,
        message: 'Metadata properties updated.'
      });
    } else {
      StemmawebAlert.show(`Error: ${resp.message}`, 'danger');
      return Promise.resolve({
        success: false,
        message: resp.message
      });
    }
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
