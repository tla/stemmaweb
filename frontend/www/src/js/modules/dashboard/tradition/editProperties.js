/**
 * 
 * @typedef {{ label: string; value: string; inputType: string }} FormMetaItem
 * 
 * @typedef {import('@types/stemmaweb').Tradition} Tradition
 * 
 */

class EditProperties extends HTMLElement {

    constructor() {
        super();
        this.addEventListener( 'click', this.showDialog );
    }

    /** @type {FormControlMap} */
    static #formControlMap = {
        'text': EditProperties.#renderTextControl
    };

    /** @type {TraditionMetaLabels} */
    static #traditionMetadataLabels = {
        name: 'Name',
        tradition: 'Tradition',
        direction: 'Direction',
        owner: 'Owner',
        access: 'Access',
        language: 'Language',
        witnesses: 'Witnesses'
    };

    /** @type {StemmaMetaLabels} */
    static #stemmaMetadataLabels = {
        stemma: 'Stemma'
    };

    /** @type {DirectionMap} */
    static #directionMap = {
        'LR': 'Left to right',
        'RL': 'Right to Left',
        'BI': 'Bi-directional'
    }

    /**
    * Maps 'LR' etc. to more readable 'Left to right' form.
    * 
    * @param {string} key
    * @returns {string}
    */
    static #mapDirection( key ) {
        return EditProperties.#directionMap[key] || key;
    }

    /**
    * @param {Tradition} tradition Tradition to render the metadata for.
    * @returns {FormMetaItem[]} Array of metadata items to display on a form.
    */
    static #metadataFromTradition(tradition) {
        const labels = EditProperties.#traditionMetadataLabels;
        return [
            {
                label: labels.name,
                value: tradition.name,
                inputType: 'text'  // We could expand this into `inputOptions: {}` when we need more info per control.
            },
            {
                label: labels.language,
                value: tradition.language,
                inputType: 'text'  // We could expand this into `inputOptions: {}` when we need more info per control.
            }            
        ]
    }

    connectedCallback() {
        this.render();
    }

    #initDialogStyle() {
        // This ensures the modal is placed nicely fit with the properties sidebar.
        // TODO: Add responsiveness on resize.
        let edit_properties_modal_width = window
          .getComputedStyle($('sidebar_properties'))
          .getPropertyValue('width');
        return 'margin-right: 0px; width: ' + edit_properties_modal_width + '; margin-top: 50px; transform: none;'
    }

    /**
    * @param {MetaItem} item
    * @returns {string}
    */
    static #renderTextControl(item) {
        return `
            <label 
                for="name" 
                id="edit_property_name_field" 
                class="form-label"
            >
                ${item.label}
            </label>
            <input
                id="name"
                type="text"
                name="name"
                value="${item.value}"
                class="form-control has-validation"
                size="40"
                required=""
            />
            <div class="invalid-feedback">
                A name is required for the tradition.
            </div>
            <br />
            `;
    }

    /**
    * @param {MetaItem} item
    * @returns {string}
    */
    renderFormControl(item) {
        return EditProperties.#formControlMap[ item.inputType ](item);
    }

    showDialog() {
        const metaItems = EditProperties.#metadataFromTradition( STEMMA_STORE.state.parentTradition );
        const modal_body = `
            <form
            id="add_tradition_form"
            class="needs-validation"
            novalidate=""
            >
            ${ metaItems.map( this.renderFormControl ).join( '\n' ) }
            </form>  
        `
        StemmawebDialog.show( 'Edit properties', modal_body, {}, { elemStyle: this.#initDialogStyle() } );
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
        `
    }

}

customElements.define( 'edit-properties-button', EditProperties );