/**
 * @typedef {import('@types/stemmaweb').TraditionState} TraditionState
 *
 * @typedef {import('@types/stemmaweb').StemmaState} StemmaState
 *
 * @typedef {import('@types/stemmaweb').Tradition} Tradition
 * 
 * @typedef {import('@types/stemmaweb').Section} Section
 *
 * @typedef {import('@types/stemmaweb').Stemma} Stemma
 *
 * @typedef {import('d3-graphviz').Graphviz} Graphviz
 */

/** @type {import('d3')} */
const d3 = libraries.lib_d3;

/** @type {import('feather-icons')} */
const feather = libraries.lib_Feather; 
const textIcon = feather.icons['file-text'].toSvg();
const folderIcon = feather.icons['folder'].toSvg();
const publicAccessIcon = feather.icons['unlock'].toSvg();
const privateAccessIcon = feather.icons['lock'].toSvg();

/** @type {import('bootstrap')} */
const bootstrap = libraries.lib_bootstrap;


function initStemmaweb() {

  /**
   * This function will be called each time the state persisted in the
   * `STEMMA_STORE` changes. It will update the UI to reflect the current
   * state.
   *
   * @param {StemmaState} state
   */
  function onStemmaStateChanged( state ) {
    const { tradition, availableStemmata, selectedStemma } = state;
    if( tradition ){
      TraditionView.renderDefaultTraditionStemma( tradition, availableStemmata, selectedStemma );
    }
  }

  // 'Main'
  STEMMA_STORE.subscribe( onStemmaStateChanged );
  feather.replace({ 'aria-hidden': 'true' });
}
