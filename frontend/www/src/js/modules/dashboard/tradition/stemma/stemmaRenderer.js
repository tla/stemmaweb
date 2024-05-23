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
    const graphArea = d3.select('#graph-area');
    const selection = graphArea.select('#graph');
    const graph = selection.empty()
      ? graphArea.append('div').attr('id', 'graph')
      : selection;
    graph.style('height', '100%');
    this.#gvr = graph
      .graphviz()
      .width(graph.node().getBoundingClientRect().width)
      .height(graph.node().getBoundingClientRect().height)
      .fit(true);
  }
  
  /**
   * Renders the supplied `stemma` as a graph.
   *
   * @param {Graphviz} graph_root
   * @param {Tradition} tradition
   * @param {Stemma} stemma
   */
  renderStemma( tradition, stemma ) {
    this.graphvizRoot.renderDot( this.ellipse_border_to_none( stemma.dot ) );
    if( this.graphvizRoot.zoomSelection() != null ){
      this.graphvizRoot.resetZoom();
    };
    d3.select( 'g#graph0' )
      .selectAll( '.node' )
      .on( 'click', function (e, d) {
        // If the stemma editor is showing, we don't want re-rooting the stemma to be enabled.
        if( document.querySelector( '#stemma-selector-container' ).classList.contains( "show" ) ){
          TraditionView.fetch_rooted( tradition, stemma, d.key );
          stemmaRenderer.renderStemma( tradition, stemma );
        }
      } );
    Download.set_downloads( stemma.dot );
  }
 
  /**
   * Resizes the current graph/stemma when the browser window gets 
   * resized. Also set the new corresponding with on the GraphViz 
   * renderer so that subsequent stemmas are depicted at the right
   * size.
   */
  resizeSVG() {
    const margin = 14;
    const stemmaButtonsRowHeight = document.querySelector( '#stemma-buttons' ).getBoundingClientRect()['height'];
    const bbrect = document.querySelector( '#graph-area' ).getBoundingClientRect();
    const width = bbrect['width'] - ( 2 * margin );
    const factor = bbrect['height'] / window.innerHeight;
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
d3.select( window ).on( 'resize', stemmaRenderer.resizeSVG );
