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
        // Whenever a new tradition / related section is selected, update the table
        SECTION_STORE.subscribe(({ parentTradition, selectedSection }) => {
            if( selectedSection != null ){
                this.render(parentTradition, selectedSection);
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
                <td>${item.label}</td>
                <td>${item.value}</td>
            </tr>
          `;
    }

    /** @type {SectionMetaLabels} */
    static #sectionMetadataLabels = {
        name: 'Name',
        language: 'Language'
    };

    /**
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
     * 
     * @param {Section} section - Section to create view for. 
     * @returns {string} Table representation of section properties. 
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
                    <span>edit-section-properties-button</span>    
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
     * @param {Tradition} parentTradition 
     * @param {Section} selectedSection 
     */
    render( parentTradition, selectedSection) {
        if( selectedSection ) {}
        this.innerHTML = `
        <div class="position-sticky pt-3">
            ${ this.createSectionTable( selectedSection ) }
        </div>
      `;
    }

}

customElements.define( 'section-properties-view', SectionPropertiesView );