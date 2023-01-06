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

  /**
   * @param {(state: StemmaState) => void} listener The listener function to
   *   register.
   */
  subscribe(listener) {
    super.subscribe(listener);
  }

  /**
   * Sets the selected stemma by taking the one from the `availableStemmata` at
   * the supplied `index`. If the index is out of bounds, the selected stemma is
   * set to `null`.
   *
   * @param {number} index
   */
  setSelectedStemma(index) {
    const selectedStemma = this.state.availableStemmata[index] || null;
    this.setState({ ...this.state, selectedStemma });
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
        const parentTradition = traditionState.selectedTradition;
        stemmaStoreService.listStemmata(parentTradition.id).then((res) => {
          if (res.success) {
            /** @type {Stemma[]} */
            const availableStemmata = res.data;
            const selectedStemma = availableStemmata[0] || null;
            stemmaStore.setState({
              availableStemmata,
              selectedStemma,
              parentTradition
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
  parentTradition: null
});
