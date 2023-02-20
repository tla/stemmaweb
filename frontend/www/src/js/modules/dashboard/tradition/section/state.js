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
        selectedSection = availableSections.find( (availableSection) => { return availableSection.id == selectedSection.id } );
        const state = { availableSections, selectedSection };
        this.setState( state );
      } else {
        StemmawebAlert.show( `Error: ${resp.message}`, 'danger' );
      }
    });
  }

  /**
   * Fetches and appends the tradition with the supplied `tradId` to
   * `availableTraditions`. Fails silently if an error occurs during the service
   * call.
   *
   * This function is needed so that the global state can be updated after a new
   * section is created. After creating a new section, only the ID is
   * returned by Stemmarest, hence the need to fetch the whole tradition by ID.
   *
   * @param {string} traditionId
   * @param {string} sectionId
   */
  appendSection( sectionId, traditionId ) {
    sectionStoreService.getSection( tradId, sectionId ).then((res) => {
      if (res.success) {
        const sectionToAppend = res.data;
        const availableSections = [
          ...this.state.availableSections,
          sectionToAppend
        ];
        this.setState({
          ...this.state,
          availableSections,
          selectedSection: sectionToAppend
        });
      }
    });
  }

  /**
   * Updates the section in `availableSections` having the same sectionId as
   * the supplied section with the values of the supplied section.
   *
   * This function is here so that the global state can be updated after a
   * section is updated.
   *
   * @todo: Shouldn't StemmaRestService do this?
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
