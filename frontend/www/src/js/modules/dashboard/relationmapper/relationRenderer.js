class RelationRenderer {

    #relGvr = null;
  
    constructor() {
    }
    
    get relationMapperGraphvizRoot() {
      if( this.#relGvr == null ){
        this.#createGraphvizRoot();
      }
      return this.#relGvr;
    }
  
    /**
     * Constructs the graph root div governed by `graphviz`.
     *
     * @returns {Graphviz}
     */
    #createGraphvizRoot = function() {
        const relationMapperArea = d3.select( '#relation-mapper-div' );
        const selection = relationMapperArea.select( '#relation-graph' );
        const graph = selection.empty()
        ? relationMapperArea.append( 'div' ).attr( 'id', 'relation-graph' )
        : selection;
      // Because the relation mapper container is `display: none` on initialization
      // we use the dimensions of the stemma renderer that is already depicted.
      const stemmaRendererDimensions = document.querySelector( '#graph' ).getBoundingClientRect();
      graph.style( 'height', `${stemmaRendererDimensions.height}px` );
      this.#relGvr = graph
        .graphviz()
        .width( stemmaRendererDimensions.width )
        .height( stemmaRendererDimensions.height );
    }
    
    /**
     * Renders the supplied variant and relation `dot` as a graph.
     *
     * @param {Graphviz} graph_root
     * @param {Tradition} tradition
     * @param {Stemma} stemma
     */
    renderRelationsGraph( dot ) {
      this.relationMapperGraphvizRoot.renderDot( dot );
      if( this.relationMapperGraphvizRoot.zoomSelection() != null ){
        this.relationMapperGraphvizRoot.resetZoom();
      };
    }
   
    // /**
    //  * Resizes the current graph/stemma when the browser window gets 
    //  * resized. Also set the new corresponding with on the GraphViz 
    //  * renderer so that subsequent stemmas are depicted at the right
    //  * size.
    //  */
    // resizeSVG() {
    //   const margin = 14;
    //   const stemmaButtonsRowHeight = document.querySelector( '#stemma-buttons' ).getBoundingClientRect()['height'];
    //   const bbrect = document.querySelector( '#graph-area' ).getBoundingClientRect();
    //   const width = bbrect['width'] - ( 2 * margin );
    //   const factor = bbrect['height'] / window.innerHeight;
    //   const height = bbrect['height'] - stemmaButtonsRowHeight;
    //   const graphArea = d3.select('#graph-area');
    //   const svg = graphArea.select("#graph").selectWithoutDataPropagation("svg");
    //   svg
    //       .transition()
    //       .duration(700)
    //       .attr("width", width )
    //       .attr("height", height );
    //   // This is a bit weird, but we need to reset the size of the original
    //   // graphviz renderer that was set when the line
    //   // `const stemmaRenderer = new StemmaRenderer();`
    //   // was executed, and not on `this`. There's probably 
    //   // cleaner ways to do this.
    //   stemmaRenderer.graphvizRoot.width( width );
    //   stemmaRenderer.graphvizRoot.height( height );
    // }
  
  }
  
  const relationRenderer = new RelationRenderer();
//   d3.select( window ).on( 'resize', stemmaRenderer.resizeSVG );
  