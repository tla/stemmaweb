/**
 * @typedef {import('@types/stemmaweb').TraditionState} TraditionState
 *
 * @typedef {import('@types/stemmaweb').Tradition} Tradition
 */

/** @type {StemmarestService} */
const traditionStoreService = stemmarestService;

class TraditionStore extends StateStore {
  /** @param {TraditionState} initialState */
  constructor(initialState) {
    super(initialState);
  }

  /** @returns {TraditionState} State */
  get state() {
    return super.state;
  }

  /** @param {Tradition} selectedTradition */
  setSelectedTradition(selectedTradition) {
    this.setState({ ...this.state, selectedTradition });
  }

  /**
   * Fetches and appends the tradition with the supplied `tradId` to
   * `availableTraditions`. Fails silently if an error occurs during the service
   * call.
   *
   * This function is needed so that the global state can be updated after a new
   * tradition is created. After creating a new tradition, only the ID is
   * returned by Stemmarest, hence the need to fetch the whole tradition by ID.
   *
   * @param {string} tradId
   */
  appendTradition(tradId) {
    traditionStoreService.getTradition(tradId).then((res) => {
      if (res.success) {
        const traditionToAppend = res.data;
        const availableTraditions = [
          ...this.state.availableTraditions,
          traditionToAppend
        ];
        this.setState({
          ...this.state,
          availableTraditions,
          selectedTradition: traditionToAppend
        });
      }
    });
  }

  /**
   * Updates the tradition in `availableTraditions` having the same tradId 
   * as the supplied tradition with the values of the supplied tradition. 
   *
   * This function is here so that the global state can be updated after a
   * tradition is updated. 
   *
   * @param {Tradition} tradition
   */
  updateTradition( tradition ) {
    const tradIdx = this.state.availableTraditions.findIndex( availableTradition => availableTradition.id == tradition.id );
    if( tradIdx > -1 ) {
      let availableTradition = this.state.availableTraditions[ tradIdx ];
      availableTradition = Object.assign( availableTradition, tradition );
      this.setState({
        ...this.state
      });
    }
  }

  /** @param {(function(TraditionState): void)|(function(TraditionState, TraditionState): void)} listener */
  subscribe(listener) {
    super.subscribe(listener);
  }
}

const TRADITION_STORE = new TraditionStore({
  selectedTradition: null,
  availableTraditions: []
});

function initState() {
  traditionStoreService.listTraditions().then((res) => {
    /** @type {Tradition[]} */
    const availableTraditions = res.data;
    const selectedTradition = availableTraditions[0];
    /** @type {TraditionState} */
    const state = { availableTraditions, selectedTradition };
    TRADITION_STORE.setState(state);
  });
}

// Attach the listener of `STEMMA_STORE` so that it is updated whenever the
// selected tradition changes.
TRADITION_STORE.subscribe(STEMMA_STORE.traditionListener);

/** Load traditions asynchronously from the server. */
window.addEventListener('load', initState);
