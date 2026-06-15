/** @typedef {import('@types/stemmaweb').BaseResponse} BaseResponse */

/**
 * Object to interact with the Stemmarest Middleware's API through high-level
 * functions.
 *
 * @type {StemmarestService}
 */
const editRelationTypeService = stemmarestService;


class EditRelationType extends HTMLElement {

  #relationType = {};
  #color = '';

  constructor( relationType, color ) {
    super();
    this.#relationType = relationType;
    this.#color = color;
    this.addEventListener( 'click', this.showDialog );
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

  /** @type {RelationTypeLabels} */
  relationTypeLabels = {
    name: 'Name',
    description: 'Description',
    bindlevel: 'Bind level',
    is_colocation: 'colocation',
    is_transitive: 'transitive',
    is_generalizable: 'generalizable',
    use_regular: 'use regularized form',
    is_weak: 'yielding',
    color: 'Relation color'
  };

  relationTypeMeta() {
    var meta = [
      {
        label: this.relationTypeLabels.name,
        value: this.#relationType.name,
        inputOptions: {
          control: 'text', 
          size: 20, 
          required: true 
        }
      },
      {
        label: this.relationTypeLabels.description,
        value: this.#relationType.description,
        inputOptions: {
          control: 'text', 
          size: 80
        }
      },
      {
        label: this.relationTypeLabels.bindlevel,
        value: this.#relationType.bindlevel,
        inputOptions: {
          control: 'text', 
          size: 10
        }
      }
    ];
    [ 'is_colocation', 'is_transitive', 'is_generalizable', 'use_regular', 'is_weak' ].forEach( prop => {
      meta.push( {
        label: this.relationTypeLabels[prop],
        value: this.#relationType[prop],
        inputOptions: {
          control: 'checkbox',
          checked: this.#relationType[prop]
        }
      } )
    } );
    meta.push(
      {
        label: this.relationTypeLabels.color,
        value: this.#color,
        inputOptions: {
          control: 'colorpicker'
        }
      }
    );
    return meta;
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
    const width = $('sidebar-properties').getBoundingClientRect().width;
    return (
      `margin-right: 0px; width: ${width}px; margin-top: 50px;`
    );
  }

  showDialog() {
    const metaItems = this.relationTypeMeta();
    const modal_body = `
            <form
            id="edit-relation-type-form"
            class="needs-validation"
            novalidate=""
            >
            ${ metaItems.map( formControlFactory.renderFormControl ).join( '\n' ) }
            </form>
        `;
    StemmawebDialog.show(
      'Edit relation type',
      modal_body,
      { onOk: this.processForm },
      {
        okLabel: 'Save',
        elemStyle: this.#createDialogStyle()
      }
    );
    // TODO: Actually this (and the eventListener should be handled by the colorpicker form conrol.
    // But form controls are returning strings and we cannot attach evenlisteners to those.
    // Probably form controls should become true web components that can be instantiated with data.
    document.querySelectorAll( '#edit-relation-type-form div.color-picker div.colors span.relation-colors' ).forEach( (element) => {
      element.addEventListener( 'click', this.selectColor );
    })
  }

  selectColor( evt ) {
    const selectedElement = document.querySelector( '#edit-relation-type-form div.color-picker div.colors span.relation-colors.selected' );
    selectedElement.classList.remove( 'selected' );
    selectedElement.querySelector( 'svg' ).innerHTML = feather.icons['square'].toSvg();
    evt.currentTarget.classList.add( 'selected' );
    evt.currentTarget.querySelector( 'svg' ).innerHTML = feather_check_square_alt;
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
    // const name = $('name_input').value;
    // const language = $('language_input').value || null;
    // const direction = $('direction_input').value;
    // const isPublic = $('access_input').checked;
    // return { name, language, direction, isPublic };
  }

  /** @returns {Promise} */
  processForm() {
    // const form = document.querySelector('#edit-tradition-properties-form');
    // if (form.checkValidity()) {
    //   const values = Object.values(
    //     EditRelationType.#extractFormValuesTradition()
    //   );
    //   const tradId = TRADITION_STORE.state.selectedTradition.id;
    //   const userId = AUTH_STORE.state.user ? AUTH_STORE.state.user.id : null;
    //   return editRelationTypeService
    //     .updateTraditionMetadata( userId, tradId, ...values )
    //     .then(EditRelationType.#handleUpdateTraditionMetadataResponse);
    // } else {
    //   form.classList.add('was-validated');
    //   return Promise.resolve({
    //     success: false,
    //     message: 'Form validation error.'
    //   });
    // }
  }

  /** @param {BaseResponse<T>} resp */
  static #handleUpdateTraditionMetadataResponse(resp) {
    // if (resp.success) {
    //   StemmawebAlert.show('Metadata properties updated.', 'success');
    //   TRADITION_STORE.updateTradition(resp.data);
    //   return Promise.resolve({
    //     success: true,
    //     message: 'Metadata properties updated.'
    //   });
    // } else {
    //   StemmawebAlert.show(`Error: ${resp.message}`, 'danger');
    //   return Promise.resolve({
    //     success: false,
    //     message: resp.message
    //   });
    // }
  }

  render() {
    this.innerHTML = `
            <a
            class="link-secondary"
            href="#"
            aria-label="Edit relation type"
            >
                <span>${feather.icons['edit'].toSvg()}</span>
            </a>
        `;
  }
}

customElements.define('edit-relation-type-button', EditRelationType);
