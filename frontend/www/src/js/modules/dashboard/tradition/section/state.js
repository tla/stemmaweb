/**
 * @typedef {import('@types/stemmaweb').SectionState} SectionState
 *
 * @typedef {import('@types/stemmaweb').TraditionState} TraditionState
 *
 * @typedef {import('@types/stemmaweb').Tradition} Tradition
 *
 * @typedef {import('@types/stemmaweb').Stemma} Stemma
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

  /** @param {(function(SectionState): void)|(function(SectionState, SectionState): void)} listener */
  subscribe(listener) {
    super.subscribe(listener);
  }

  /**
   * Sets the supplied `section` as the selected section.
   *
   * @param {Section} section The section to select.
   */
  setSelectedSection(section) {
    this.setState({ ...this.state, selectedSection: section });
  }

  /**
   * Constructs a listener to be attached to the `TraditionStore` so that each
   * time a new tradition is selected, the `SectionState` managed by the supplied
   * `sectionStore` is updated.
   *
   * @todo This is almost exactly the same as the one in stemma/state.js. Extract, abstract?
   * 
   * @returns {(state: TraditionState) => void}
   */
  get traditionListener() {
    /** @type {SectionStore} */
    const sectionStore = this;
    /** @param {TraditionState} traditionState */
    function onTraditionStateChange(traditionState) {
      if (traditionState.selectedTradition) {
        const parentTradition = traditionState.selectedTradition;
        sectionStoreService.listSections(parentTradition.id).then((res) => {
          if (res.success) {
            /** @type {Section[]} */
            const availableSections = res.data;
            const selectedSection = null;
            sectionStore.setState({
              availableSections,
              selectedSection,
              parentTradition
            });
          }
        });
      }
    }
    return onTraditionStateChange;
  }

  /**
   * Updates the Section in `availableSections` having the same sectionId as
   * the supplied section with the values of the supplied section.
   *
   * This function is here so that the global state can be updated after a
   * tradition is updated.
   *
   * @todo: This is almost exactly the same as `updateTradition` in tradition/state.js. Extract, abstract?
   * 
   * @param {Section} section
   */
    updateSection(section) {
      const sectionIdx = this.state.availableSections.findIndex(availableSection => availableSection.id == section.id);
      const sectionFound = sectionIdx > -1;
      if (sectionFound) {
        const availableSections = this.state.availableSections;
        availableSections[ sectionIdx ] = section;
        this.setState({
          ...this.state,
          availableSections,
          selectedSection: section
        });
      }
    }
  
}

const SECTION_STORE = new SectionStore({
  availableSections: [],
  selectedSection: null,
  parentTradition: null
});
