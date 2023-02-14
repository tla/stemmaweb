/** 
 * @typedef {import('@types/stemmaweb').BaseResponse} BaseResponse 
 * 
 * @typedef {import('@types/stemmaweb').Tradition} Tradition
 * 
 * @typedef {import('@types/stemmaweb').Section} Section
 * 
 * @typedef {{ 
 *      name: string,
 *      language: string 
 * }} SectionMetaLabels
 */

/**
 * Object to interact with the Stemmarest Middleware's API 
 * through high-level functions.
 *
 * @type {StemmarestService}
 */
const sectionPropertiesService = stemmarestService;

class SectionPropertiesView extends HTMLElement {

    constructor() {
        super();
        // Whenever a tradition is selected that is not me, I go away.
        TRADITION_STORE.subscribe( ( prevState, state ) => {
            if( prevState.selectedTradition != state.selectedTradition ) {
                this.innerHTML  = '';
            };
        });
        // Whenever an item in the section list is selected, update the table
        SECTION_STORE.subscribe( ( { parentTradition, selectedSection, availableSections } ) => {
            if( selectedSection != null ){
                this.render( selectedSection );
            }
        });
    }

    connectedCallback() {
        this.render();
    }

    /**
    * @param {MetaItem} item
    * @returns {string}
    */
    renderMetaItem(item) {
        return `
            <tr>
                <td class="section-property-label-cell">${item.label}</td>
                <td class="section-property-value-cell">${item.value}</td>
            </tr>
          `;
    }

    /** @type {SectionMetaLabels} */
    static #sectionMetadataLabels = {
        name: 'Name',
        language: 'Language'
    };

    /**
     * Maps section metadata to appropriate labels.
     * 
     * @param {Section} section Section to render the metadata for.
     * @returns {MetaItem[]} Array of metadata items to display.
    */
    static #metadataFromSection(section) {
        const labels = SectionPropertiesView.#sectionMetadataLabels;
        return [
            {
                label: labels.name,
                value: section.name
            },
            {   
                label: labels.language,
                value:  section.language
            }
        ];
    }

    /**
     * Array defining the custom order of the metadata table rows.
     *
     * @type {string[]}
     */
    static #metadataLabelOrder = [
        SectionPropertiesView.#sectionMetadataLabels.name,
        SectionPropertiesView.#sectionMetadataLabels.language
    ];

    /**
     * Sorts the metadata items by the order defined in
     * {@link SectionPropertiesView.#metadataLabelOrder}.
     *
     * @param {MetaItem[]} items Array of metadata items to sort.
     * @returns {MetaItem[]} Sorted array of metadata items.
     */
    static sortedMetaItems(items) {
        return items.sort((a, b) => {
        const aIndex = SectionPropertiesView.#metadataLabelOrder.indexOf(a.label);
        const bIndex = SectionPropertiesView.#metadataLabelOrder.indexOf(b.label);
        return aIndex - bIndex;
        });
    }

    /**
     * Creates an HTML representation of a table listing the names and 
     * values of properties for the sections of a tradition.
     * 
     * @param {Section} section - Section to create view for. 
     * @returns {string} HTML representation of section properties table. 
     */
    createSectionTable( section ){
        if( section ) {
            /** @type {MetaItem[]} */
            const sectionMeta = SectionPropertiesView.sortedMetaItems( SectionPropertiesView.#metadataFromSection(section) );
            return `            
                <h6
                class="sidebar-heading d-flex justify-content-between align-items-center px-3 mt-4 mb-1 text-muted"
                >
                    <span>Section Properties</span>
                    <edit-section-properties-button/>   
                </h6>
                <div class="table-responsive px-3 py-3">
                <table class="table table-striped table-sm">
                    <tbody id="tradition_info">
                        ${sectionMeta.map(this.renderMetaItem).join('\n')}
                    </tbody>
                </table>
                </div>
            `
        } else {
            return '';
        }
    }

    /**
     * Creates a container to hold the HTML table representation yielded
     * by @see SectionPropertiesView.createSectionTable.
     *  
     * @param {Section} selectedSection 
     */
    render( selectedSection) {
        if( selectedSection ) {}
        this.innerHTML = `
        <div class="position-sticky pt-3">
            ${ this.createSectionTable( selectedSection ) }
        </div>
      `;
    }

}

customElements.define( 'section-properties-view', SectionPropertiesView );