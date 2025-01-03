class TraditionView extends HTMLElement {

  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
    const stemmaDotEditor = document.querySelector( '#stemma-dot-editor' );
    libraries.lib_TabOverride.set( stemmaDotEditor );
    libraries.lib_TabOverride.tabSize(4);
  }

  /**
   * Reorients the stemma, i.e. makes the clicked node the root of the tree.
   * 
   * @param {*} tradition 
   * @param {*} stemma 
   * @param {*} sigil 
   */
  static fetch_rooted( tradition, stemma, sigil ) {
    stemmarestService
      .reorientStemmaTree( tradition.id, stemma.identifier, sigil )
      .then( (resp) => {
        // We first fade out the existing graph…
        const graphArea = d3.select('#graph-area');
        graphArea.transition().call( speedy_transition ).style( 'opacity', '0.0' ).on( 'end', () => {
          stemma.dot = resp.dot;
          stemmaRenderer.renderStemma( tradition, stemma );
        } );
      } )
      .catch( (error) => {
        StemmawebAlert.show(
          `Error during rooting of stemma: ${res.message}`,
          'danger'
        );
      } );
  }

  /**
   * Renders the supplied `tradition` object as a graph in the center of the
   * dashboard.
   *
   * @param {Tradition} tradition
   * @param {Stemma[]} stemmata
   * @param {Stemma | null} selectedStemma
   */
  static renderDefaultTraditionStemma( tradition, stemmata, selectedStemma ) {
    // We first fade out the existing graph…
    const graphArea = d3.select('#graph-area');
    graphArea.transition().call( speedy_transition ).style( 'opacity', '0.0' ).on( 'end', () => {
      //And then we render the first stemma for the current tradition.
      const graphDiv = stemmaRenderer.graphvizRoot;
      // The work horse, graphviz puts in the first stemma here,
      // and we have some mild transitions for posh fade in.
      graphDiv
        // NB Failed approach notice…
        // This causes a slower transition, but the graph still 'drops in'.
        // It just slows *all* transitions. I wish I knew why the butt ugly
        // 'drop in' has been selected as the default undefaultable transition.
        // .transition( function(){ return mellow_transition( d3.transition() ) } )
        .on('renderEnd', function () {
          graphArea.transition().call( mellow_transition ).style('opacity', '1.0' );
        });
        // Render the stemma, if any. 
        if (stemmata.length > 0) {
          stemmaRenderer.renderStemma( tradition, selectedStemma || stemmata[0] );
        }
      // Render the stemma selector buttons.
      TraditionView.renderStemmaSelectors( stemmata );
    } );
  }
  
  static renderStemmaSelectors( stemmata ) {
    // Here we put in the slide indicators that will allow the user to
    // switch to different stemmata.
    const stemmaSelector = d3.select('#stemma-selectors');
    stemmaSelector.selectAll('*').remove();
    stemmaSelector
      .selectAll( 'span' )
      .data( stemmata )
      .enter()
      .append( 'span' )
      .html( (d, i) => {
        const selectedIndex = STEMMA_STORE.selectedIndex;
        const isSelected =
          (selectedIndex === -1 && i === 0) || selectedIndex === i;
        const selectedAttr = isSelected
          ? " selected"
          : "";
        return `<div class="stemma-selector link-secondary${selectedAttr}" data-index="${i}">${feather.icons['file'].toSvg()}</div>`;
      })
      .on( 'click', function (e, d) {
        // Update the state with the selected stemma
        STEMMA_STORE.setSelectedStemma( d );
      } );
  }

  render() {
    this.innerHTML = `
      <div id="topbar-menu" class="d-flex justify-content-between flex-wrap align-items-center pt-2 pb-1 border-bottom">
        <tradition-title></tradition-title>
        <div id="stemma-buttons-container" class="d-flex justify-content-between ms-0 pt-3 mb-2 lex-nowrap">
          <div id="section-title"></div>
          <stemma-buttons></stemma-buttons>
        </div>
      </div>


      <div id="stemma-editor-graph-container">

        <div id="stemma-editor-container">
          <div id="stemma-dot-editor-container">
            <textarea id="stemma-dot-editor">
            </textarea>
          </div>
        </div>

        <div id="graph-container">
          <edit-stemma-buttons></edit-stemma-buttons>
          <div class="" id="graph-area">
          </div>
        </div>

      </div>

      
      <relation-mapper></relation-mapper>

    `;
  };

}

customElements.define( 'tradition-view', TraditionView );
