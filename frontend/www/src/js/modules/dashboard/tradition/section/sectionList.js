/** 
 * @typedef {import('@types/stemmaweb').BaseResponse} BaseResponse 
 * 
 * @typedef {import('@types/stemmaweb').Section} Section
 *
 * @typedef {import('@types/stemmaweb').StemmarestService} StemmarestService
 */

/**
 * Object to interact with the Stemmarest Middleware's API  
 * through high-level functions.
 *
 * @type {StemmarestService}
 */
const sectionService = stemmarestService;

class SectionList extends HTMLElement {

    #sections = [];

    constructor() {
        super();
    }

    /**
     * 
     * @param {Event} evt - Event fired by Draggable.
     * @param {number} idx - Index of the draggable item in its Draggable list.
     */
    toggleHighlightDragged( evt, idx ){
        evt.target.children.item(idx).classList.toggle( 'dragging-highlight' );
    }

    getSectionId( evt, idx ) {
        const sectionListItem = evt.target.children.item( idx )
        return sectionListItem ? sectionListItem.querySelector( 'div' ).getAttribute( 'sect-id' ) : 'none';
    }

    connectedCallback() {
        this.render();
        this.populate();
        Sortable.create( 
            this.querySelector( 'ul' ), 
            { 
                onStart: (evt) => { this.toggleHighlightDragged( evt, evt.oldIndex ) },
                onEnd: (evt) => { this.toggleHighlightDragged( evt, evt.newIndex ) },
                onUpdate: (evt) => { 
                    // NOTE: array index is zero based, but n-th child is counted "naturally". (Why btw?!)
                    // figure out tradition.id, section.id, priorSectionId.
                    const moveSectionId = this.getSectionId( evt, evt.newIndex );
                    const moveAfterSectionId = this.getSectionId( evt, evt.newIndex-1 );
                    sectionService.moveSection( this.getAttribute( 'trad-id' ), moveSectionId, moveAfterSectionId )
                        .then( (resp) => {
                            if( !resp.success ) {
                                this.connectedCallback();
                                const alertInfo = 'Sections could not be reordered due to a server error. The original order has been restored.<br/>';
                                StemmawebAlert.show( `${alertInfo} (Server responded with: “${resp.message}”.)`, 'danger', 7000 );
                            }
                        }
                    );
                }
            }
        );
    }

    /**
     * Fetches sections for a tradition and iterates over them 
     * to create a sections list.
     */
    populate() {
        sectionService.listSections( this.getAttribute( 'trad-id' ) )
            .then( (resp) => { 
                if( resp.success ) {
                    this.#sections = resp.data;
                    this.#sections.forEach( (section) => this.renderSectionName(section) );
                } else {
                    StemmawebAlert.show(`Error: ${res.message}`, 'danger');
                }
            });
    }

    /**
     * Triggered when a user select on of the section listed in the left hand side tradition navigation tree.
     * 
     * @param {Section} section 
     */
    selectSection( section ) {
        const traditionId = this.getAttribute( 'trad-id' );
        /**
         * This treats the case when multiple section lists in the left hand side bar (traditions tree) have been opened.
         * In which case a user may click on a section in a tradition that is currently not selected. 
         * In that case we update the selected tradition in TRADITION_STORE.
         * @todo: Do we want to get the selected tradition this way, or should we have a convenience method TRADITION_STORE.getTradition( tradId )?
         */
        if( traditionId != TRADITION_STORE.state.selectedTradition.id ) {
            const tradition = TRADITION_STORE.state.availableTraditions.find( availableTradition => availableTradition.id == traditionId );
            TRADITION_STORE.setSelectedTradition( tradition );
        };
        // This will trigger state change on which SectionPropertiesView
        // will handle the rendering of the selected section.
        SECTION_STORE.setSelectedSection( section );
    }
    

    /**
     * Creates and appends a section list item to the section list.
     *  
     * @param {Section} section 
     */
    renderSectionName( section ) {
        const sectionListItem = document.createElement( 'li' );
        sectionListItem.setAttribute( 'class', 'nav-item' );
        sectionListItem.innerHTML = `<div class="section-name" sect-id="${section.id}">${textIcon}&nbsp;${section.name}</div>`;
        sectionListItem.addEventListener( 'mousedown', () => { this.selectSection( section ) } );
        this.querySelector( 'ul' ).appendChild( sectionListItem );
    }

    render() {
        this.innerHTML = `<ul class="nav flex-column"></ul>`;  
    }

}

customElements.define( 'section-list', SectionList );