/**
 * This is just a placeholder for now.
 * 
 * @todo: riff of EditProperties.js after extracting form controls in their own classes.
 */
class EditSectionProperties extends HTMLElement {

    constructor() {
        super();
        this.addEventListener('click', this.showDialog);
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
        const top = $('property-table-view').getBoundingClientRect().bottom;
        return (
            `margin-right: 0px; width: ${width}px; margin-top: ${top}px;`
        );
    }

    showDialog() {
        const section = SECTION_STORE.state.selectedSection;
        const metaItems = SectionPropertiesView.sortedMetaItems( 
            SectionPropertiesView.metadataFromSection(section) 
        );
        const modal_body = `
            <form
                id="edit-section-properties-form"
                class="needs-validation"
                novalidate=""
            >
                ${metaItems.map( formControlFactory.renderFormControl ).join( '\n' )}
            </form>
        `;
        StemmawebDialog.show(
            'Edit section properties',
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
    static #extractFormValuesSection() {
        const name = $('name_input').value;
        const language = $('language_input').value || null;
        return { name, language };
    }

    /** @returns {Promise} */
    processForm() {
        const form = document.querySelector('#edit-section-properties-form');
        if (form.checkValidity()) {
            const values = Object.values(
                EditSectionProperties.#extractFormValuesSection()
            );
            const tradId = TRADITION_STORE.state.selectedTradition.id;
            const userId = AUTH_STORE.state.user ? AUTH_STORE.state.user.id : null;
            const sectionId = SECTION_STORE.state.selectedSection.id;
            // Note that `editPropertiesService` is reused from EditProperties.js.
            return editPropertiesService
                .updateSectionMetadata( userId, tradId, sectionId, ...values)
                .then( EditSectionProperties.#handleUpdateSectionMetadataResponse );
        } else {
            form.classList.add('was-validated');
            return Promise.resolve({
            success: false,
            message: 'Form validation error.'
            });
        }
    }

    /** @param {BaseResponse<T>} resp */
    static #handleUpdateSectionMetadataResponse(resp) {
        if ( resp.success ) {
            StemmawebAlert.show( 'Section properties updated.', 'success' );
            // @todo: Should the next line be wrapped in a try..catch?
            SECTION_STORE.updateSection( resp.data );
            return Promise.resolve({
                success: true,
                message: 'Section properties updated.'
            });
        } else {
            StemmawebAlert.show( `Error: ${resp.message}`, 'danger' );
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
                aria-label="Edit section properties"
            >
                <span>${feather.icons['edit'].toSvg()}</span>
            </a>
        `;
        }
    }

customElements.define('edit-section-properties-button', EditSectionProperties);
