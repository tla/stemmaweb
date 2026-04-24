class StemmaRenderer {

  #gvr = null;

  constructor() {
  }

  /**
   * @param {string} dot
   * @returns {string}
   */
  ellipse_border_to_none( dot ) {
    return dot.replace(
      '" {',
      '" {\n\t node [color=none style=filled fillcolor=white]'
    );
  }

  get graphvizRoot() {
    if( this.#gvr == null ){
      this.#createGraphvizRoot();
    }
    return this.#gvr;
  }

  /**
   * Constructs the graph root div governed by `graphviz`.
   *
   * @returns {Graphviz}
   */
  #createGraphvizRoot = function() {
    const graphArea = document.querySelector( '#graph-area' );
    const selection = d3.select( graphArea.querySelector( '#graph' ) );
    const graph = selection
      ? d3.select( graphArea ).append( 'div' ).attr( 'id', 'graph' )
      : selection;
    const computedStyle = window.getComputedStyle( graphArea );
    var graphHeight = graphArea.getBoundingClientRect().height;
    graphHeight -= parseFloat( computedStyle.paddingTop ) + parseFloat( computedStyle.paddingBottom );
    // graph.style('height', '100%');
    this.#gvr = graph
      .graphviz()
      .width( graph.node().getBoundingClientRect().width )
      .height( graphHeight )
      .fit( true );
  }
  
  /**
   * Renders the supplied `stemma` as a graph.
   *
   * @param {Graphviz} graph_root
   * @param {Tradition} tradition
   * @param {Stemma} stemma
   */
  renderStemma( tradition, stemma ) {
    if( tradition && stemma ) {
      this.graphvizRoot.renderDot( this.ellipse_border_to_none( stemma.dot ) );
      if( this.graphvizRoot.zoomSelection() != null ){
        this.graphvizRoot.resetZoom();
      };
      d3.select( 'g#graph0' )
        .selectAll( '.node' )
        .on( 'click', function (e, d) {
          // If the stemma editor is showing, we don't want re-rooting the stemma to be enabled.
          if( document.querySelector( '#stemma-selector-buttons' ).classList.contains( "show" ) ){
            if( userIsOwner() ) {
              TraditionView.fetch_rooted( tradition, stemma, d.key );
              stemmaRenderer.renderStemma( tradition, stemma );
            }
          }
        } );
    }
    Download.set_downloads( stemma && stemma.dot );
  }
 
  /**
   * Resizes the current graph/stemma when the browser window gets 
   * resized. Also sets the new corresponding width on the GraphViz 
   * renderer so that subsequent stemmas are depicted at the right
   * size.
   */
  resizeSVG() {
    // TODO: only on visible?
    const margin = 14;
    const stemmaButtonsRowHeight = document.querySelector( '#stemma-buttons' ).getBoundingClientRect()['height'];
    const bbrect = document.querySelector( '#graph-area' ).getBoundingClientRect();
    const width = bbrect['width'] - ( 2 * margin );
    const height = bbrect['height'] - stemmaButtonsRowHeight;
    const graphArea = d3.select('#graph-area');
    const svg = graphArea.select("#graph").selectWithoutDataPropagation("svg");
    svg
        .transition()
        .duration(700)
        .attr("width", width )
        .attr("height", height );
    // This is a bit weird, but we need to reset the size of the original
    // graphviz renderer that was set when the line
    // `const stemmaRenderer = new StemmaRenderer();`
    // was executed, and not on `this`. There's probably 
    // cleaner ways to do this.
    stemmaRenderer.graphvizRoot.width( width );
    stemmaRenderer.graphvizRoot.height( height );
  }

}

const stemmaRenderer = new StemmaRenderer();
window.addEventListener( 'resize', stemmaRenderer.resizeSVG );
