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

  /**
   * When a stemma is successfully added in editStemma.js this function
   * is called to update the set of stemmata in `availableStemmata` and 
   * to select that stemma as visible. Setting the state then triggers
   * a redraw in stemmaweb.js.
   *
   * This function is here so that the global state can be updated after a
   * stemma is added.
   *
   * @param {Stemma} stemma
   */
  stemmaAdded( stemma ) {
    const availableStemmata = this.state.availableStemmata;
    availableStemmata.splice( 0, 0, stemma );
    this.setState({
      ...this.state,
      availableStemmata,
      selectedStemma: stemma
    });
  }
  
  /**
   * When a stemma is successfully saved in editStemma.js this function
   * is called to update that stemma in the set of stemmata in 
   * `availableStemmata`. Setting the state then triggers
   * a redraw in stemmaweb.js.
   *
   * This function is here so that the global state can be updated after a
   * stemma is saved.
   *
   * @param {Stemma} stemma
   */
  stemmaSaved( stemma ) {
    const availableStemmata = this.state.availableStemmata;
    const stemmaIdx = this.state.availableStemmata.findIndex( availableStemma => availableStemma.identifier == stemma.identifier);
    availableStemmata[ stemmaIdx ] = stemma;
    this.setState({
      ...this.state,
      availableStemmata,
      selectedStemma: stemma
    });
  }

  /**
   * When a stemma is successfully deleted in editStemma.js this function
   * is called to update the stemma set in 
   * `availableStemmata`. Setting the state then triggers
   * a redraw in stemmaweb.js.
   *
   * This function is here so that the global state can be updated after a
   * stemma is deleted.
   *
   * @param {Stemma} stemma
   */
  stemmaDeleted( stemma ) {
    const availableStemmata = this.state.availableStemmata;
    var stemmaIdx = this.state.availableStemmata.findIndex( availableStemma => availableStemma.identifier == stemma.identifier);
    availableStemmata.splice( stemmaIdx, 1 );
    if( stemmaIdx > (availableStemmata.length - 1) ){
      stemmaIdx = availableStemmata.length - 1;
    }
    if( stemmaIdx == -1 ){
      stemma = null;
    } else {
      stemma = availableStemmata[stemmaIdx];
    }
    this.setState({
      ...this.state,
      availableStemmata,
      selectedStemma: stemma
    });
  }

}

const STEMMA_STORE = new StemmaStore({
  availableStemmata: [],
  selectedStemma: null,
  tradition: null
});
