/**
 * @typedef {import('@types/stemmaweb').SectionState} SectionState
 *
 * @typedef {import('@types/stemmaweb').Section} Section
 */

/** @type {StemmarestService} */
const sectionStoreService = stemmarestService;


class SectionStore extends StateStore {

  /** @param {SectionState} initialState */
  constructor(initialState) {
    super(initialState);
  }

  /** @returns {SectionState} State */
  get state() {
    return super.state;
  }

  /** @param {Section} selectedSection */
  setSelectedSection( selectedSection ) {
    sectionStoreService.listSections( TRADITION_STORE.state.selectedTradition.id ).then((res) => {
      if (res.success) {
        const availableSections = res.data;
        // refresh state of Section,it may be stale.
        if( selectedSection ) {
          selectedSection = availableSections.find( (availableSection) => { return availableSection.id == selectedSection.id } );
        }
        const state = { availableSections, selectedSection };
        this.setState( state );
      } else {
        StemmawebAlert.show( `Error: ${resp.message}`, 'danger' );
      }
    });
  }

  /**
   * Informs all SectionLists (well, at least those that registered 
   * a listener for the event) that a section was added.
   * 
   * @param {string} sectionId
   * @param {string} traditionId
   */
  sectionAppended( sectionId, traditionId ) {
    const sectionAppendedEvent = new CustomEvent( 'sectionAppended', { detail: { sectionId: sectionId, traditionId: traditionId } } );
    document.querySelectorAll( 'section-list' ).forEach( (elem) => { elem.dispatchEvent( sectionAppendedEvent ) } );
  }

  /**
   * Informs all SectionLists (well, at least those that registered 
   * a listener for the event) that a section was deleted.
   * 
   * @param {string} sectionId
   * @param {string} traditionId
   */
  sectionDeleted( sectionId, traditionId ) {
    // const sectionsWithoutDeleted = availableSections.filter(
    //   (sect) => sect.id !== section.id
    // );
    // this.setState({
    //   availableSections: sectionsWithoutDeleted,
    //   selectedSection: null
    // });
    const sectionDeletedEvent = new CustomEvent( 'sectionDeleted', { detail: { sectionId: sectionId, traditionId: traditionId } } );
    document.querySelectorAll( 'section-list' ).forEach( (elem) => { elem.dispatchEvent( sectionDeletedEvent ) } );
    document.querySelectorAll( 'section-properties-view' ).forEach( (elem) => { elem.dispatchEvent( sectionDeletedEvent ) } );
  }

  /**
   * Updates the section in `availableSections` having the same sectionId as
   * the supplied section with the values of the supplied section.
   *
   * This function is here so that the global state can be updated after a
   * section is updated.
   * 
   * @param {Section} section
   */
  updateSection(section) {
    const sectionIdx = this.state.availableSections.findIndex( ( availableSection ) => { return availableSection.id == section.id } );
    const sectionFound = sectionIdx > -1;
    if ( sectionFound ) {
      const availableSections = this.state.availableSections;
      availableSections[ sectionIdx ] = section;
      this.setState({
        ...this.state,
        availableSections,
        selectedSection: section
      });
    }
  }

/** 
* @param { (state:SectionState)=>void|(prevState:SectionState,state:SectionState)=>void } listener - The listener function to register.
*/
subscribe(listener) {
    super.subscribe(listener);
  }
}

const SECTION_STORE = new SectionStore({
  selectedSection: null,
  availableSections: []
});

function initSectionState() {
  sectionStoreService.listSections( TRADITION_STORE.state.selectedTradition.id ).then((res) => {
    if (res.success) {
      /** @type {Section[]} */
      const availableSections = res.data;
      const selectedSection = null;
      /** @type {SectionState} */
      const state = { availableSections, selectedSection };
      SECTION_STORE.setState( state );
    }
  });
}
