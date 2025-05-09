class RelationRenderer {

    #relGvr = null;
    #height = 0;
    #width = 0;
    #panXRatio = 0;
    #panCause = '';

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

    set panCause( panCause ) {
      this.#panCause = panCause;
    }

    get panCause() {
      return this.#panCause;
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
            // await this.resetZoom();
            this.pan();
            this.relationMapperGraphvizRoot.zoomBehavior().on( 'end', ( zoomEvent, d ) => {
              debugLog( this, 'zoomEvent:', zoomEvent );
              const extentRatio = relationRenderer.calculateViewBoxExtentRatio( zoomEvent, d );
              const panXRatio = relationRenderer.calculatePanXRatio( zoomEvent, d );
              debugLog( this, `this.#panCause: ${this.#panCause}.` );
              debugLog( this, `relationRenderer.panCause: ${relationRenderer.panCause}.` );
              // TODO: This works, it's butt ugly.
              if( relationRenderer.panCause != 'drag' ){ 
                document.querySelector( 'node-density-chart' ).showPanPosition( panXRatio, extentRatio );
              }
              relationRenderer.panCause = ''
            } );
            this.setPanLimits();
            usedOptions.onEnd();
          }
        );
      this.relationMapperGraphvizRoot.renderDot( dot );
    }
    
    /**
     * This function is a work around because the onEnd and onRenderEnd of 
     * d3-graphvis.js do not fire as expected. When they fire the lay out and 
     * rendering may have finished but apparently the svg has not been added
     * to the DOM and no properties of it can be retrieved. But getting to
     * its attributes is necessary to set, for instance, the pan limits and 
     * to calculate the minimap position indicator position and size. 
     * Therefore, `stemmaButtons.js` calls this function explicitly once the 
     * graph has been faded in and is surely part of the DOM. It then simply
     * triggers a `resetZoom`, which creates a `zoomBehavior` that is needed 
     * to compute various other stuff.
     */
    resetZoom() {
      debugLog( this, 'We should reset zoom if needed.' );
      if( this.relationMapperGraphvizRoot.zoomSelection() != null ){
        debugLog( this, 'Actually resetting zoom.' );
        this.relationMapperGraphvizRoot.resetZoom();
        this.setPanLimits();
      };
    }

    setPanLimits() {
      const polygonElement = d3.select( '#relation-graph svg g polygon' );
      if( polygonElement.node() ) {
        const gBbox = d3.select( '#relation-graph svg g polygon' ).node().getBBox();
        debugLog( this, 'Trying to compute bounding box pan limits on relation graph.' );
        const width = gBbox.width;
        const height = gBbox.height;
        const margin = 100;
        debugLog( this, `NOT currently setting pan limits, width: ${width}, height: ${height}, margin: ${margin}.` );
        // Absolutely not sure the following is what we want, but it seems to work for now.
        // this.relationMapperGraphvizRoot.zoomBehavior().translateExtent([[ LEFT, BOTTOM ], [ RIGHT, TOP ]]);    
        // TODO: PROBLEM: this results in a rerender (double render) and then as a result in a wrong positioning
        // of the pan indicator.
        // this.relationMapperGraphvizRoot.zoomBehavior().translateExtent([[-margin, -450], [width, height]]);    
      }
    }

    pan() {
      debugLog( this, 'Function pan called, this message is pre-pan.' );
      if( this.#panXRatio != 0  ) {
        debugLog( this, 'Function pan called, starting pan.' );
        const gExtent = d3.select( '#relation-graph svg g polygon' ).node().getBBox().width;
        const xTranslate = this.#panXRatio * gExtent;
        this.#panXRatio = 0;
        const graphSvg = d3.select( '#relation-graph svg' )
        const zoomBehavior = this.relationMapperGraphvizRoot.zoomBehavior();
        zoomBehavior.translateTo( graphSvg, xTranslate, 0 );
      }
    }

    calculatePanXRatio( zoomEvent, d ) {
      const polygonElement = d3.select( '#relation-graph svg g polygon' );
      var panXRatio = 0;
      if( polygonElement.node() ) {
        const scale = zoomEvent.transform.k;
        const xTranslate = zoomEvent.transform.x;
        const gExtent = polygonElement.node().getBBox().width * scale;
        panXRatio = -( xTranslate / gExtent );
      }
      return panXRatio;
    }

    calculateViewBoxExtentRatio( zoomEvent, d ) {
      // We'll need scaling at some point.
      const scale = zoomEvent.transform.k;
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
      debugLog( this, `svgWidth: ${svgWidth}, svgViewBox.width: ${svgViewBox.width}.` );
      // length in pixels * screenToViewBoxFactor gives you how much length the 
      // pixels represent in the coordinate system of the svg canvas.
      const screenToViewBoxFactor = svgViewBox.width/svgWidth;
      debugLog( this, `screenToViewBoxFactor: ${screenToViewBoxFactor}.` );
      // How much we can see from the graph depends on the width of the 
      // div that contains the variant graph. The width of that
      // we want to express as a ratio of the width of the graph itself.
      // Note that this is not (yet, in this current code) the same as
      // svgWidth, as that doesn't resize.
      const relationGraphElementWidth = document.querySelector( '#relation-graph' ).getBoundingClientRect().width * (1/scale);
      const extent = relationGraphElementWidth * screenToViewBoxFactor;
      debugLog( this, `Part seen (extent): ${extent}.` );

      const polygonElement = d3.select( '#relation-graph svg g polygon' );
      var panExtentRatio = 0;
      if( polygonElement.node() ) {
        const gExtent = polygonElement.node().getBBox().width;
        panExtentRatio = extent / gExtent;
        debugLog( this, `k (scale): ${scale}.` );
        debugLog( this, `panExtentRatio: ${panExtentRatio}.` );
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
  