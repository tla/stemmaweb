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
        // If I was deleted, I go away.
        this.addEventListener( 'sectionDeleted', () => { this.innerHTML = '' } );
        // Whenever a tradition is selected that is not me, I go away.
        TRADITION_STORE.subscribe( ( prevState, state ) => {
            // Check on id because other metadata may have changed.
            if( prevState.selectedTradition && ( prevState.selectedTradition.id != state.selectedTradition.id ) ) {
                this.innerHTML = '';
            };
        });
        // Whenever an item in the section list is selected, update the table
        SECTION_STORE.subscribe( ( { availableSections, selectedSection } ) => {
            if( selectedSection ){
                if( document.querySelector( '#editable-section-info-table-container' ) ){
                    this.updateRender( selectedSection );
                } else {
                    this.render( selectedSection );
                }
            }
        });
    }

    connectedCallback() {
        this.render();
    }

    hide() {
        fadeToDisplayNone( document.querySelector( 'section-properties-view div' ) );
    }
    
    show() {
        fadeToDisplayNone( document.querySelector( 'section-properties-view div' ), { 'reverse': true } );
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

    /**
    * @param {MetaItem} item
    * @returns {string}
    */
    renderMetaItemWide(item) {
        return `
            <td class="reading-property-${item.label.toLowerCase()}-cell">${item.value}</td>
          `;
    }

    /**
    * @param {MetaItem} item
    * @returns {string}
    */
    renderMetaItemTHeadWide(item) {
        return `
            <td class="reading-property-${item.label.toLowerCase()}-cell reading-property-column-header">${item.label}</td>
        `;
    }


    /** @type {SectionMetaLabels} */
    static #sectionMetadataLabels = {
        id: 'Section',
        name: 'Name',
        language: 'Language'
    };

    /**
     * Maps section metadata to appropriate labels.
     * 
     * @param {Section} section Section to render the metadata for.
     * @returns {MetaItem[]} Array of metadata items to display.
    */
    static metadataFromSection(section) {
        const labels = SectionPropertiesView.#sectionMetadataLabels;
        return [
            {
                label: labels.id,
                value: section.id
            },
            {
                label: labels.name,
                value: section.name,
                inputOptions: { control: 'text', size: 40, required: true }
            },
            {   
                label: labels.language,
                value:  section.language,
                inputOptions: { control: 'text', size: 40, required: true }
            }
        ];
    }

    /** @type {ReadingMetaLabels} */
    static #readingMetadataLabels = {
        id: 'Reading',
        text: 'Text',
        witnesses: 'Witnesses'
    };

    /**
     * Maps reading metadata to appropriate labels.
     * 
     * @param {Reading} reading Reading to render the metadata for.
     * @returns {MetaItem[]} Array of metadata items to display.
    */
    static metadataFromReading( reading ) {
        const labels = SectionPropertiesView.#readingMetadataLabels;
        return [
            {
                label: labels.id,
                value: reading.id
            },
            {
                label: labels.text,
                value: reading.text,
                inputOptions: { control: 'text', size: 40, required: true }
            },
            {   
                label: labels.witnesses,
                value: reading.witnesses.sort().join( ', ' ),
                inputOptions: { control: 'text', size: 40, required: true }
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
            const sectionMeta = SectionPropertiesView.sortedMetaItems( SectionPropertiesView.metadataFromSection(section) );
            // TODO: h6 for properties view in relation mapper should get margin-bottom: 0.3rem (is 0.5)
            return `            
                <h6 class="sidebar-heading d-flex justify-content-between align-items-center px-3 mt-2 text-muted">
                    <span id="section-properties-view-title">Section Properties</span>
                    <div class="property-buttons">
                        <delete-section-button></delete-section-button>
                        <edit-section-properties-button></edit-section-properties-button> 
                    </div>
                </h6>
                <div id="editable-section-info-table-container" class="table-responsive px-3 py-1">
                    <table class="table table-striped table-sm">
                        <tbody id="section-info">
                            ${sectionMeta.map(this.renderMetaItem).join('\n')}
                        </tbody>
                    </table>
                </div>
            `
        } else {
            return '';
        }
    }

    updateRender( section ){
        const sectionInfoTableContainerElement = document.querySelector( '#editable-section-info-table-container' )
        const sectionMeta = SectionPropertiesView.sortedMetaItems( SectionPropertiesView.metadataFromSection( section ) );
        sectionInfoTableContainerElement.innerHTML = `
            <table class="table table-striped table-sm">
                <tbody id="section-info">
                    ${sectionMeta.map(this.renderMetaItem).join('\n')}
                </tbody>
            </table>
        `;
    }

    /**
     * Creates a container to hold the HTML table representation yielded
     * by @see SectionPropertiesView.createSectionTable.
     *  
     * @param {Section} selectedSection 
     */
    render( selectedSection) {
        if( selectedSection ) {
            this.innerHTML = `
                <div class="position-sticky pt-2">
                    ${ this.createSectionTable( selectedSection ) }
                </div>
            `;
        }
    }

}

customElements.define( 'section-properties-view', SectionPropertiesView );