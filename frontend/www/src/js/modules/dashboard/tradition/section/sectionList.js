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
        this.addEventListener( 'sectionAppended', this.rerenderList );
        this.addEventListener( 'sectionDeleted', this.rerenderList );
        const traditionId = this.getAttribute( 'trad-id' );
        SECTION_STORE.subscribe( ( state, prevState ) => {
            // IF this is me…
            if( TRADITION_STORE.state.selectedTradition.id == traditionId ) {
                // AND if this is not a first time load…
                if( state.selectedSection && prevState.selectedSection ) {
                    // AND if this is some update concerning the currently selected Section…
                    if( state.selectedSection.id == prevState.selectedSection.id ) {
                        // AND if this is a name change…
                        // well, THEN we do something (i.e. change the name in the Tradion/Section tree view).
                        if( state.selectedSection.name != prevState.selectedSection.name ) {
                            this.querySelector( `ul li div[sect-id="${state.selectedSection.id}"] span` ).innerHTML = prevState.selectedSection.name;
                        };
                    };
                };
            };
        })
    }

    /**
     *  Redraw this section list if a section was added (or deleted).
     *  State object `SECTION_STORE` triggers this event, which it
     *  is instructed to by `AddTraditionModal#handleResponseSection`
     *  (in `addTradition.js`).
     */
    rerenderList( evt ) {
        if ( this.getAttribute( 'trad-id' ) == evt.detail.traditionId ) {
            this.connectedCallback();
        }
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
        this.mysort = libraries.lib_Sortable.Sortable.create( 
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
        const traditionId = this.getAttribute( 'trad-id' );
        sectionService.listSections( traditionId )
            .then( (resp) => { 
                if( resp.success ) {
                    this.#sections = resp.data.map( ( section ) => { 
                        section.traditionId = traditionId;
                        return section;
                    });
                    this.#sections.forEach( (section) => this.renderSectionName(section) );
                } else {
                    StemmawebAlert.show(`Error: ${resp.message}`, 'danger');
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
        TRADITION_STORE.setSelectedTradition( 
            TRADITION_STORE.state.availableTraditions.find( 
                (tradition) => { return tradition.id == traditionId } 
            )
        );
        TraditionList.highlightFolderSelectedTradition( traditionId );
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
        sectionListItem.innerHTML = `<div sect-id="${section.id}">${textIcon}&nbsp;<span class="section-name">${section.name}</span></div>`;
        sectionListItem.addEventListener( 'mousedown', () => { this.selectSection( section ) } );
        this.querySelector( 'ul' ).appendChild( sectionListItem );
    }

    render() {
        this.innerHTML = `<ul class="nav flex-column"></ul>`;  
    }

}

customElements.define( 'section-list', SectionList );