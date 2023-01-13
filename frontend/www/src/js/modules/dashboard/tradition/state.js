/**
 * @typedef {import('@types/stemmaweb').TraditionState} TraditionState
 *
 * @typedef {import('@types/stemmaweb').Tradition} Tradition
 */

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
   * @param {(state: TraditionState) => void} listener The listener function to
   *   register.
   */
  subscribe(listener) {
    super.subscribe(listener);
  }
}

const TRADITION_STORE = new TraditionStore({
  selectedTradition: null,
  availableTraditions: []
});

/** @type {StemmarestService} */
const traditionStoreService = stemmarestService;

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

/** Load traditions asynchronously from the server. */
window.addEventListener('load', initState);
