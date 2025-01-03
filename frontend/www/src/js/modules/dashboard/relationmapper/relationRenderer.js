class RelationRenderer {

    #relGvr = null;
    #height = 0;
    #width = 0;

    constructor() {
    }
    
    set height( height ) {
      this.#height = height;
    }

    set width( width ) {
      this.#width = width;
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
      graph.style( 'height', `${this.#height}px` );
      this.#relGvr = graph
        .graphviz()
        .logEvents( false );
    }
    
    /**
     * Renders the supplied variant and relation `dot` as a graph.
     *
     * @param {Graphviz} graph_root
     * @param {Tradition} tradition
     * @param {Stemma} stemma
     */
    renderRelationsGraph( dot, options={} ) {
      const defaultOptions =  { 
        'onEnd': () => {}
      };
      const usedOptions = { ...defaultOptions, ...options };
      this.#height = usedOptions.height || this.#height;
      this.#width = usedOptions.width || this.#width;
      this.relationMapperGraphvizRoot
        .width( this.#width )
        .height( this.#height )
        .on( 'end', usedOptions.onEnd );
      this.relationMapperGraphvizRoot.renderDot( dot );
      if( this.relationMapperGraphvizRoot.zoomSelection() != null ){
        this.relationMapperGraphvizRoot.resetZoom();
      };
    }
   
    // TODO: resizing on window change size.

    /**
     // TODO(?): Why do we destroy the graphviz instance for the relation mapper on the node
     * on the node we created it for? It makes more sense to keep the instance and reuse
     * it to depict new versions of the same relation graph, or to depict relations
     * form other sections/traditions, right? Yes, except if we do the rendering of 
     * subsequent relation graphs takes forever. Below are the logs of an initial and
     * follow up renderings (numbers are time in ms per event). No idea why the same
     * graph takes 7 seconds to render a second time, while it only takes 1 initially.
     *
     * Initial rendering
     * 
     * Event  2 layoutStart            0
     * Event  3 layoutEnd            869
     * Event  4 dataExtractEnd        81
     * Event  5 dataProcessPass1End   19
     * Event  6 dataProcessPass2End    5
     * Event  7 dataProcessEnd         1
     * Event  8 renderStart            0
     * Event 14 zoom                 119
     * Event  9 renderEnd              0
     * Event 13 end                    0
     * 
     * 
     * Second rendering
     * 
     * Event  2 layoutStart            1
     * Event  3 layoutEnd            847
     * Event  4 dataExtractEnd        73
     * Event  5 dataProcessPass1End 6259
     * Event  6 dataProcessPass2End    5
     * Event  7 dataProcessEnd         0
     * Event  8 renderStart            0
     * Event 14 zoom                   1
     * Event  9 renderEnd             83
     * Event 13 end                    1
     * Event 14 zoom                   0 
     */

    destroy() {
      if ( this.#relGvr ) {
        this.#relGvr.destroy();
        this.#relGvr = null;
      }
      d3.select( '#relation-graph' ).remove();
    }

  }
  
  const relationRenderer = new RelationRenderer();
  