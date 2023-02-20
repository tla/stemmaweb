/** 
 * @typedef {import('@types/stemmaweb').BaseResponse} BaseResponse 
 * 
 * @typedef {import('@types/stemmaweb').Tradition} Tradition
 *
 * @typedef {import('@types/stemmaweb').StemmarestService} StemmarestService
 */

/**
 * Object to interact with the Stemmarest Middleware's API 
 * through high-level functions.
 *
 * @type {StemmarestService}
 */
const traditionService = stemmarestService;

/**
 * Class representing the traditions navigation list/tree
 * on the left hand side of the GUI.
 */
class TraditionList extends HTMLElement {

    #sections = [];

    constructor() {
        super();
        // Listen for any state change regarding traditions.
        TRADITION_STORE.subscribe( ( prevState, state ) => {
            // We ignore any state change except when traditions are fetched for the 
            // very first time. Re-rendering the navigation tree is rather pointless.
            if ( prevState.selectedTradition == null ) {
                this.render( state.availableTraditions );
            } else {
                // The case when a tradition was deleted or added.
                if ( prevState.availableTraditions.length !=  state.availableTraditions.length ) {
                    this.render( state.availableTraditions );
                }
                // The case where a name was changed in the metadata.
                if ( prevState.selectedTradition.name != state.selectedTradition.name ) {
                    this.querySelector( `a[trad-id="${state.selectedTradition.id}"].nav-link span.tradition-nav-name` ).innerHTML = state.selectedTradition.name;
                }
            }
        });
      }
    
    connectedCallback() {
    }

    /**
     * Stores clicked/selected tradition in state object.
     * Prevents default action (i.e. following the canonical link).
     * 
     * @param {Event} evt 
     * @param {Tradition} tradition 
     */
    selectTradition( evt, tradition ) {
        evt.preventDefault();
        TRADITION_STORE.setSelectedTradition( tradition );
    }
        
    /**
     * Toggles the visibility of the sections list for each
     * tradition in the list or traditions.
     * 
     * @param {Tradition} tradition 
     */
    toggleSectionList( tradition ){
        TRADITION_STORE.setSelectedTradition( tradition );
        const sectionListElement = this.querySelector( `section-list[trad-id="${tradition.id}"]` );
        fadeIn( sectionListElement ); 
        sectionListElement.classList.toggle( 'show' );
    }
    
    /**
     * Creates a list item for a tradition to be added to the 
     * traditions and sections navigation tree.
     * 
     * @param {Tradition} tradition 
     * @returns 
     */
    createTraditionListItem( tradition ) {
        const traditionListItem = document.createElement( 'li' );
        traditionListItem.setAttribute( 'class', 'nav-item' );
        traditionListItem.innerHTML = `
            <div class="tradition-list-item d-flex">
                <div class="folder-icon">${folderIcon}</div>
                <div>
                    <a href="api/tradition/${tradition.id}" trad-id="${tradition.id}" class="nav-link">
                        <span class="tradition-nav-name">${tradition.name}</span>
                    </a>
                </div>
            </div>
            <div>
                <section-list trad-id="${tradition.id}" class="collapse"></section-list>
            </div>`
        traditionListItem.querySelector( 'div div a' ).addEventListener( 'click', (evt) => { this.selectTradition( evt, tradition ) } );
        traditionListItem.querySelector( 'div div.folder-icon' ).addEventListener( 'click', () => { this.toggleSectionList( tradition ) } );
        return traditionListItem;
    }

    /**
     * Renders a container for the traditions and sections navigation tree.
     * Adds a list item for each tradition using @see SectionPropertiesView.createTraditionListItem.
     * 
     * @param {Tradition[]} traditions 
     */
    render( traditions ) {
        this.innerHTML = `
            <ul id="traditions-list" class="nav flex-column mb-2"></ul>`;
        const traditionListElement = this.querySelector( 'ul' )
        traditions.forEach( (tradition) => traditionListElement.appendChild( this.createTraditionListItem( tradition ) ) );
    }

}

customElements.define( 'tradition-list', TraditionList );