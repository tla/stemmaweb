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
    selectedTradition = this.state.availableTraditions.find( (availableTradition) => { return availableTradition.id == selectedTradition.id } );
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
   * Updates the tradition in `availableTraditions` having the same tradId as
   * the supplied tradition with the values of the supplied tradition.
   *
   * This function is here so that the global state can be updated after a
   * tradition is updated.
   *
   * @param {Tradition} tradition
   */
  updateTradition(tradition) {
    const tradIdx = this.state.availableTraditions.findIndex(availableTradition => availableTradition.id == tradition.id);
    const traditionFound = tradIdx > -1;
    if (traditionFound) {
      const availableTraditions = this.state.availableTraditions;
      availableTraditions[ tradIdx ] = tradition;
      this.setState({
        ...this.state,
        availableTraditions,
        selectedTradition: tradition
      });
    }
  }

/** 
* @param { (state:TraditionState)=>void|(prevState:TraditionState,state:TraditionState)=>void } listener - The listener function to register.
*/
subscribe(listener) {
    super.subscribe(listener);
  }
}

const TRADITION_STORE = new TraditionStore({
  selectedTradition: null,
  availableTraditions: []
});


function sortPrivatePublicThenAlphabetical( tradition_a, tradition_b ) {
  var a;
  var b;
  // is_public may be true, false, or undefined. This way we make it more securely comparable.
  tradition_a.is_public == true ? a=1 : a=0;
  tradition_b.is_public == true ? b=1 : b=0;
  if( a < b ) {
    return -1;
  } else if( a > b ) { 
    return 1;
  }
  // If there is no sorting resolution at this point
  // go to the 2nd item
  return tradition_a.name.localeCompare( tradition_b.name );
}

function initState() {
  traditionStoreService.listTraditions().then((res) => {
    if (res.success) {
      /** @type {Tradition[]} */
      const availableTraditions = res.data;
      availableTraditions.sort( sortPrivatePublicThenAlphabetical );
      const selectedTradition = availableTraditions[0];
      /** @type {TraditionState} */
      const state = { availableTraditions, selectedTradition };
      TRADITION_STORE.setState(state);
      initSectionState();
    }
  });
}

// Attach the listener of `STEMMA_STORE` so that it is updated whenever the
// selected tradition changes.
TRADITION_STORE.subscribe(STEMMA_STORE.traditionListener);

/** Load traditions asynchronously from the server. */
window.addEventListener( 'load', initState );
