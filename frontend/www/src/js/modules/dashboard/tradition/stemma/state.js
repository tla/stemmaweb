/**
 * @typedef {import('@types/stemmaweb').StemmaState} StemmaState
 *
 * @typedef {import('@types/stemmaweb').TraditionState} TraditionState
 *
 * @typedef {import('@types/stemmaweb').Tradition} Tradition
 *
 * @typedef {import('@types/stemmaweb').Stemma} Stemma
 */

/** @type {StemmarestService} */
const stemmaStoreService = stemmarestService;

class StemmaStore extends StateStore {
  /** @param {StemmaState} initialState */
  constructor(initialState) {
    super(initialState);
  }

  /** @returns {StemmaState} State */
  get state() {
    return super.state;
  }

  /** @param {(function(StemmaState): void)|(function(StemmaState, StemmaState): void)} listener */
  subscribe(listener) {
    super.subscribe(listener);
  }

  /**
   * Sets the supplied `stemma` as the selected stemma.
   *
   * @param {Stemma} stemma The stemma to select.
   */
  setSelectedStemma(stemma) {
    this.setState({ ...this.state, selectedStemma: stemma });
  }

  /**
   * @returns {number} The index of the currently selected stemma in the list of
   *   all available stemmata.
   */
  get selectedIndex() {
    const { availableStemmata, selectedStemma } = this.state;
    return availableStemmata.indexOf(selectedStemma);
  }

  /**
   * Constructs a listener to be attached to the `TraditionStore` so that each
   * time a new tradition is selected, the `StemmaState` managed by the supplied
   * `stemmaStore` is updated.
   *
   * @returns {(state: TraditionState) => void}
   */
  get traditionListener() {
    /** @type {StemmaStore} */
    const stemmaStore = this;
    /** @param {TraditionState} traditionState */
    function onTraditionStateChange(traditionState) {
      if (traditionState.selectedTradition) {
        const tradition = traditionState.selectedTradition;
        stemmaStoreService.listStemmata( tradition.id ).then((res) => {
          if( res.success ){
            /** @type {Stemma[]} */
            const availableStemmata = res.data;
            const selectedStemma = availableStemmata[0] || null;
            stemmaStore.setState({
              availableStemmata,
              selectedStemma,
              tradition
            });
          }
        });
      }
    }
    return onTraditionStateChange;
  }
}

const STEMMA_STORE = new StemmaStore({
  availableStemmata: [],
  selectedStemma: null,
  tradition: null
});
