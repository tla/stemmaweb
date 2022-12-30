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
