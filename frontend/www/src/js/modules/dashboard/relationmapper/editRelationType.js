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
  #defaultOptions = {
    dialogTitle: 'Edit relation type',
    closeLabel: 'Close',
    onUpdated: this.onEndOfUpdate,
    succesMessage: 'Relation type properties updated.',
    constrained: true
  };
  #activeOptions = {} 

  constructor( relationType, options ) {
    super();
    const defaultOptions = { 
    }
    this.#activeOptions = { ...this.#defaultOptions, ...options }
    this.#relationType = relationType;
    this.#color = relationType.display.color;
    this.addEventListener( 'click', this.showDialog );
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
          size: 10,
          disabled: this.#activeOptions.constrained 
        }
      }
    ];
    [ 'is_colocation', 'is_transitive', 'is_generalizable', 'use_regular', 'is_weak' ].forEach( prop => {
      meta.push( {
        label: this.relationTypeLabels[prop],
        value: this.#relationType[prop],
        inputOptions: {
          control: 'checkbox',
          checked: this.#relationType[prop],
          disabled: this.#activeOptions.constrained 
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

  onEndOfUpdate( relationType ) {
    const oldColor = `color-${this.#color}`;
    this.#color = relationType.display.color;
    const newColor = `color-${this.#color}`;
    const colorElement = this.closest( 'tr' ).querySelector( '.relation-type-color-cell span.relation-colors' );
    colorElement.classList.replace( oldColor, newColor );
    const nameElement = this.closest( 'tr' ).querySelector( '.relation-type-name-cell' );
    nameElement.innerHTML = relationType.name;
    const deleteRelationElement = this.closest( 'div' ).querySelector( 'delete-relation-type-button' );
    deleteRelationElement.relationName = relationType.name;
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
      this.#activeOptions.dialogTitle,
      modal_body,
      { onOk: () => { 
        this.processForm.call( this )
          .then( ( relationType ) => { 
            if ( relationType ) {
              this.#activeOptions.onUpdated.call( this, relationType );
            }
          } );
        } 
      },
      {
        okLabel: 'Save',
        closeLabel: this.#activeOptions.closeLabel,
        elemStyle: this.#createDialogStyle()
      }
    );
    // TODO: Actually this (and the eventListener) should be handled by the colorPicker form control.
    // But form controls are returning strings and we cannot attach evenListeners to those.
    // Probably form controls should become true web components that can be instantiated with data.
    document.querySelectorAll( '#edit-relation-type-form div.color-picker div.colors span.relation-colors' ).forEach( (element) => {
      element.addEventListener( 'click', this.selectColor );
    })
  }

  selectColor( evt ) {
    const selectedElement = document.querySelector( '#edit-relation-type-form div.color-picker div.colors span.relation-colors.selected' );
    selectedElement.classList.remove( 'selected' );
    selectedElement.innerHTML = feather.icons['square'].toSvg();
    evt.currentTarget.classList.add( 'selected' );
    evt.currentTarget.innerHTML = feather_check_square_alt;
  }

  /**
   * @returns {{
   *   name: string
   *   description: string | null
   *   bindlevel: string | null
   *   is_colocation: string
   *   is_transitive: boolean
   *   is_generalizable: boolean
   *   use_regular: boolean
   *   is_weak: boolean
   * }}
   */
  static #extractFormValuesRelationType() {
    const name = $('name_input').value;
    const description = $('description_input').value;
    const bindlevel = $('bind-level_input').value;
    const is_colocation = $('colocation_input').checked;
    const is_transitive = $('transitive_input').checked;
    const is_generalizable = $('generalizable_input').checked;
    const use_regular = $('use-regularized-form_input').checked;
    const is_weak = $('yielding_input').checked;
    const selectedColorElement = document.querySelector( '#edit-relation-type-form div.color-picker div.colors span.relation-colors.selected' );
    const color = selectedColorElement.dataset.value;
    return { name, description, bindlevel, is_colocation, is_transitive, is_generalizable, use_regular, is_weak, 'display': { 'color': color } } 
  }

  /** @returns {Promise} */
  processForm() {
    const form = document.querySelector('#edit-relation-type-form');
    if ( form.checkValidity() ) {
      const editedRelationType = EditRelationType.#extractFormValuesRelationType();
      const tradId = TRADITION_STORE.state.selectedTradition.id;
      const userId = AUTH_STORE.state.user ? AUTH_STORE.state.user.id : null;
      return editRelationTypeService
        .updateRelationType( userId, tradId, editedRelationType )
        .then( ( relationTypeFromResponse ) => {
          if ( relationTypeFromResponse ) {
            this.#relationType = relationTypeFromResponse;
            StemmawebAlert.show( this.#activeOptions.succesMessage, 'success' );
            return this.#relationType;
          } // We don't handle/signal a failed update here because
            // stemmarestService.updateRelationType already does.
        } );
    } else {
      form.classList.add('was-validated');
      return Promise.resolve( {
        success: false,
        message: 'Form validation error.'
      } );
    }
  }

  render() {
    this.innerHTML = `
            <a
            class="link-secondary"
            href="#"
            aria-label="${this.#activeOptions.dialogTitle}"
            >
                <span>${feather.icons['edit'].toSvg()}</span>
            </a>
        `;
  }
}

customElements.define( 'edit-relation-type-button', EditRelationType );
