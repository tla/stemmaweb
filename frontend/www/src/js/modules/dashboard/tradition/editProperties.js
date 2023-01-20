class EditPropertiesButton extends HTMLElement {

    constructor() {
        super();
        this.addEventListener( 'click', this.showDialog );
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

    showDialog() {
        const modal_body = `
            <form
            id="add_tradition_form"
            class="needs-validation"
            novalidate=""
            >
            <label for="direction" class="form-label"
            >Text direction</label
            >
            <select name="direction" class="form-select" id="direction">
                <option value="LR" selected="">Left to Right</option>
                <option value="RL">Right to Left</option>
                <option value="BI">Bi-directional</option>
            </select>
            <br />
            <div class="form-check">
                <input
                class="form-check-input"
                type="checkbox"
                value=""
                id="new_public"
                name="public"
                />
                <label class="form-label form-check-label" for="new_public">
                Allow public display
                </label>
            </div>
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

customElements.define( 'edit-properties-button', EditPropertiesButton );