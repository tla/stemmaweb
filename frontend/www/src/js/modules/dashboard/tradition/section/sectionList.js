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

    connectedCallback() {
        this.render();
        this.populate();
    }

    populate() {
        sectionService.listSections( this.getAttribute( 'trad-id' ) )
            .then( (resp) => { 
                if( resp.success ) {
                    console.log( resp.data );
                    this.#sections = resp.data;
                    this.#sections.forEach( (section) => this.createSectionName(section) );
                } else {
                    StemmawebAlert.show(`Error: ${res.message}`, 'danger');
                }
            });
    }

    /**
     * 
     * @param {Section} section 
     */
    selectSection( section ) {
        // This will trigger `onTraditionStateChanged`
        // in which we handle the rendering of the selected section.
        SECTION_STORE.setSelectedSection( section );
    }
    

    /**
     * 
     * @param {Section} section 
     */
    createSectionName( section ) {
        const sectionListItem = document.createElement( 'li' );
        sectionListItem.setAttribute( 'class', 'nav-item' );
        sectionListItem.innerHTML = `<div class="section-name" sect-id="${section.id}">${textIcon}&nbsp;${section.name}</div>`;
        sectionListItem.addEventListener( 'click', () => { this.selectSection( section ) } );
        this.querySelector( 'ul' ).appendChild( sectionListItem );
    }

    render() {
        this.innerHTML = `<ul class="nav flex-column"></ul>`;  
    }

}

customElements.define( 'section-list', SectionList );