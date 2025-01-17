class RelationRenderer {

    #relGvr = null;
    #height = 0;
    #width = 0;
    #panXRatio = 0;

    constructor() {
    }
    
    set height( height ) {
      this.#height = height;
    }

    set width( width ) {
      this.#width = width;
    }

    set panXRatio( panXRatio ) {
      this.#panXRatio = panXRatio;
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
        .on( 'end', async () => {
            await this.resetZoom();
            this.pan();
            this.relationMapperGraphvizRoot.zoomBehavior().on( 'end', ( zoomEvent, d ) => {
              const extentRatio = relationRenderer.calculateViewBoxExtentRatio();
              const panXRatio = relationRenderer.calculatePanXRatio( zoomEvent, d );
              document.querySelector( 'node-density-chart' ).showPanPosition( panXRatio, extentRatio );
            } );
            usedOptions.onEnd();
          }
        );
      this.relationMapperGraphvizRoot.renderDot( dot );
      }
      
    resetZoom() {
      if( this.relationMapperGraphvizRoot.zoomSelection() != null ){
        this.relationMapperGraphvizRoot.resetZoom();
      };
    }

    pan() {
      if( this.#panXRatio != 0  ) {
        const gExtent = d3.select( '#relation-graph svg g polygon' ).node().getBBox().width;
        const xTranslate = this.#panXRatio * gExtent;
        const zoomBehavior = this.relationMapperGraphvizRoot.zoomBehavior();
        const graphSvg = d3.select( '#relation-graph svg' )
        zoomBehavior.translateTo( graphSvg, xTranslate, 0 );
        this.#panXRatio = 0;
      }
    }

    calculatePanXRatio( zoomEvent, d ) {
      const polygonElement = d3.select( '#relation-graph svg g polygon' );
      if( polygonElement.node() ) {
        const xTranslate = zoomEvent.transform.x;
        const gExtent = polygonElement.node().getBBox().width;
        const panXRatio = -( xTranslate / gExtent );
        return panXRatio;
      }
    }

    calculateViewBoxExtentRatio() {
      // The pixel width of the svg and the width if the viewBox defined in it
      // determine the scale factor we need to apply if we want to transform
      // screen distances in pixels to distances in the coordinate system of the 
      // svg/viewBox.
      const svgElement = document.querySelector( '#relation-graph svg' );
      // svgWidth is the width in actual pixels of the HTML svg container.
      const svgWidth = svgElement.getAttribute( 'width' );
      // The svgViewBox size is the virtual dimension of the part of the svg canvas
      // we can see inside of the HTML container. 
      const svgViewBox = svgElement.viewBox.baseVal;
      console.log( svgWidth, svgViewBox.width );
      // length in pixels * screenToViewBoxFactor gives you how much length the 
      // pixels represent in the coordinate system of the svg canvas.
      const screenToViewBoxFactor = svgViewBox.width/svgWidth;
      console.log( 'screenToViewBoxFactor', screenToViewBoxFactor );
      // How much we can see from the graph depends on the width of the 
      // div that contains the variant graph. The width of that
      // we want to express as a ratio of the width of the graph itself.
      // Note that this is not (yet, in this current code) the same as
      // svgWidth, as that doesn't resize.
      const relationGraphElementWidth = document.querySelector( '#relation-graph' ).getBoundingClientRect().width;
      const extent = relationGraphElementWidth * screenToViewBoxFactor;
      console.log( 'part seen', extent );

      const polygonElement = d3.select( '#relation-graph svg g polygon' );
      var panExtentRatio = 0;
      if( polygonElement.node() ) {
        const gExtent = polygonElement.node().getBBox().width;
        panExtentRatio = extent / gExtent;
        console.log( 'panExtentRatio', panExtentRatio );
      }
      return panExtentRatio;

      // Lastly we need to factor in a zoom factor (how much did the user
      // zoom in or out). But we'll do this later.
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
  