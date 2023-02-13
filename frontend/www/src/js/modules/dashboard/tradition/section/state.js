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
}

const SECTION_STORE = new SectionStore({
  availableSections: [],
  selectedSection: null,
  parentTradition: null
});
