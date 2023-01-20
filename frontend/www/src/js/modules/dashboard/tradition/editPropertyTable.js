class EditPropertyTable extends HTMLElement {

    constructor() {
        super();
        // Hmm.. I could do the below and 'shadow' the property table
        // updating the form fields and values with every change,
        // but really it only needs done when the form is actually shown.
        //
        // Also there is going to be a lot of repetition between this and 
        // propertyTableView.js
        STEMMA_STORE.subscribe(({ parentTradition, selectedStemma }) => {
            this.render(parentTradition, selectedStemma);
          });
    }

    connectedCallback() {
        this.render();
        this.#initModal();
        this.#initStyles();
    }

    attributeChangedCallback( name, oldValue, newValue ) {
        console.log('Custom square element attributes changed.');
    }
      
    #initModal() {
        // Initialize the edit_properties_modal dialog
        const edit_properties_modal_elem = $( 'edit_properties_modal' );
        new bootstrap.Modal( edit_properties_modal_elem, { show: true } );
    }    

    #initStyles() {
        // This ensures the edit_properties_modal is placed nicely fit with the properties sidebar.
        // TODO: Add responsiveness on resize.
        const dashboard_stemmaweb_css = getStyleSheet('dashboard-stemmaweb');
        let edit_properties_modal_width = window
          .getComputedStyle($('sidebar_properties'))
          .getPropertyValue('width');
        dashboard_stemmaweb_css.insertRule(
          '#edit_properties_modal.modal.fade div.modal-dialog { margin-right: 0px; width: ' +
          edit_properties_modal_width +
            '; margin-top: 50px; transform: none; }'
        );
    }
    
    render() {
        this.innerHTML = `
        <div
          class="modal fade"
          id="edit_properties_modal"
        >
          <div class="modal-dialog">
            <div class="modal-content">
              <div class="modal-header">
                <h5 class="modal-title">Edit properties</h5>
                <button
                  type="button"
                  class="btn-close edit-properties-modal_close"
                  data-bs-dismiss="modal"
                  aria-label="Close"
                ></button>
              </div>
              <div class="modal-body">
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
                    <br />
                    <div id="edit_properties_modal_savecancel" class="py-3">
                      <button
                        type="button"
                        class="btn btn-secondary edit-properties-modal_close"
                        data-bs-dismiss="modal"
                      >
                        Close
                      </button>
                      <button type="submit" class="btn btn-primary">
                        Save changes
                      </button>
                    </div>
                  </form>  
              </div>
              <!--
              <div class="modal-footer">
              </div>
              -->
            </div>
          </div>
      </div>
    `;
    }

}

customElements.define( 'edit-properties-modal', EditPropertyTable );