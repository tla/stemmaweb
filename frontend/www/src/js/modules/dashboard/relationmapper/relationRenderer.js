class RelationRenderer {

    #relGvr = null;
    #height = 0;
    #width = 0;
    #baseTransform = '';
    #ACTIVATE = true;
    #DEACTIVATE = false;

    // TODO: get rid of this
    #panXRatio = 0;
    // TODO: get rid of this
    #panCause = '';

    #svg = null;
    #zoom = null;

    constructor() {
    }

    get zoom() {
        return this.#zoom;
    }

    set svg( svg ) {
      this.#svg = svg;
    }

    get svg() {
        return this.#svg;
    }

    set baseTransform( transform ) {
        this.#baseTransform = transform;
    }

    get baseTransform() {
        return this.#baseTransform;
    }

    set height( height ) {
      this.#height = height;
    }

    set width( width ) {
      this.#width = width;
    }


    // TODO: get rid of this
    set panXRatio( panXRatio ) {
      this.#panXRatio = panXRatio;
    }

    // TODO: get rid of this
    set panCause( panCause ) {
      this.#panCause = panCause;
    }

    // TODO: get rid of this
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
            .zoom( false )
            .logEvents( false );
    }
  
    /**
     * Renders the supplied variant and relation `dot` as a graph.
     *
     * @param {String} dot GraphViz DOT format description of the graph to display.
     * @param {Object} options
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
            .on( 'end', () => {
                // Other initialization stuff when a relation graph is loaded.
                this.#svg = d3.select( '#relation-graph svg' );

                // GraphViz.js has an inconvenient habit of doing a final translate.
                // Apparently this is to put the rendered graph front and center. 
                // We need to remember and add this base translation always when we 
                // react to any pan, zoom or brush.
                // On initiation GraphViz puts the transfrom on the g element inside the svg as
                // `transform="scale(1 1) rotate(0) translate(4 296)"`. We can get 
                // to the third element of that by `transform.baseVal.getItem(2)`.
                const gCTM = this.#svg.select( 'g' ).node().transform.baseVal.getItem(2).matrix;
                this.baseTransform = { 'x': gCTM.e, 'y': gCTM.f };
                
                this.graphZoomPan( this.#ACTIVATE );

                // When a new graph is loaded we need to 'reset' the zoom.
                // I CANNOT DO THIS, because it makes the graph jump after brush!
                // But WHY?????
                // Edit: the brush seems to make the graph jump anyway.. (Yes, it does.)
                // d3.select( '#relation-graph' ).call( this.#zoom.transform, d3.zoomIdentity );

                this.graphNodesDrag( this.#ACTIVATE );

                d3.select( window )
                    .on( 'keydown', (event) => { this.onKeyDown.call( this, event ) } )
                    .on( 'keyup', (event) => { this.onKeyUp.call( this, event ) } );

                usedOptions.onEnd();
            } )
            .renderDot( dot );
    }

    onKeyDown( event ) {
        if( event.key == 'Shift' ){
            this.graphZoomPan( this.#DEACTIVATE );
            this.graphNodesDrag( this.#DEACTIVATE );
            this.graphBrush( this.#ACTIVATE );
        };
    }

    onKeyUp( event ) {
        if( event.key == 'Shift' ){
            this.graphBrush( this.#DEACTIVATE );
            this.graphZoomPan( this.#ACTIVATE );
            this.graphNodesDrag( this.#ACTIVATE );
		}
    }

    graphZoomPan( zoomable ) {
        if( zoomable ){
            this.#zoom = d3.zoom()
                .scaleExtent([0.2, 1.2])
                // `this` is always the object that owns the call, which is `#the-graph-container`
                // in this case. But we want this to be `the-graph`, hence we use `.call` to
                // pass the right 'owner' into the zoomed function. See also
                // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/call
                .on( 'zoom', ( {transform} ) => { this.repairBaseTranslate.call( this, transform ) } );
            d3.select( '#relation-graph' ).call( this.#zoom );
        } else {
            d3.select( '#relation-graph' ).on( '.zoom', null );
        };
    }

    graphNodesDrag( draggable ) {
        if( draggable ){
            this.#svg.selectAll( 'g.node' )
                .attr( 'cursor', 'grab' )
                .call( d3.drag()
                    .on( 'start', this.dragStarted )
                    .on( 'drag', this.dragged )
                    .on( 'end', this.dragEnded ) 
                );
			this.#svg.selectAll( 'g.node' ).on( 'click', ()=>( console.log( 'click' ) ) );
        } else {
            // Unset draggability of nodes, d3.drag internally uses `.drag` for
            // the listeners; see https://d3js.org/d3-drag#_drag.
            this.#svg.selectAll( 'g' ).on( '.drag', null );
        }
    }

    getEllipseCenter( node ){
        return { x:node.cx.baseVal.value, y:node.cy.baseVal.value };
    }

    graphBrush( brushable ) {
        if( brushable ){
            this.#svg.append( 'g' )
                .call( d3.brush()
                    .keyModifiers( false )
                    .on( 'brush', ( event ) => {
                            if( event.selection ){
                            const [[x0, y0], [x1, y1]] = event.selection;
                            // Note that `event.selection` gets you the viewport coordinates 
                            // that the brush masks. You need to transform these into coordinates
                            // in the svg coordinate space. 
                            // (Note that for this you need to know an origin, in case of
                            // GraphViz.ja the upper left corner of the viewBox is (0,0) when 
                            // no other default transformations are applied.)
                            // See `viewboxCoordinates2SVGCoordinates` for the actual transformation.
                            const ellipses = this.#svg.selectAll( 'g g.node ellipse' );
                            ellipses
                                .each( (d,i,nodes) => {
                                    // What is the 'extent' of the brush mask in the svg coordinate space?
                                    const [ x0Svg, y0Svg ] = this.viewboxCoordinates2SVGCoordinates( [x0, y0] );
                                    const [ x1Svg, y1Svg ] = this.viewboxCoordinates2SVGCoordinates( [x1, y1] );
                                    // What is de center x and y of an ellips in that space?
                                    const ellipseCenter = this.getEllipseCenter( nodes[i] );
                                    const cxEllipse = ellipseCenter.x + this.baseTransform.x; 
                                    const cyEllipse = ellipseCenter.y + this.baseTransform.y;
                                    // Does de mask cover the center of the ellipse (datum)? 
                                    if ( cxEllipse>=x0Svg &&  cxEllipse<=x1Svg && cyEllipse>=y0Svg && cyEllipse<=y1Svg ) {
                                        // TODO: Should be CSS classed.
                                        d3.select( nodes[i] ).attr( 'stroke', 'red' );
                                    } else {
                                        d3.select( nodes[i] ).attr( 'stroke', 'black' );
                                    };
                                } );
                            }
                        } 
                    )
                ).attr( 'class', 'brush' );
        } else {
            const brush = this.#svg.select( 'g.brush' )
            brush.on( '.brush', null );
            brush.remove();
        }
    }

    viewboxCoordinates2SVGCoordinates( [ x, y ] ) {
        const currentTransform = d3.zoomTransform( this.#svg.select( 'g' ).node() );
        return [ 
            ( (1/currentTransform.k) * ( x - currentTransform.x ) ), 
            ( (1/currentTransform.k) * ( y - currentTransform.y ) ) 
        ];
    }

    dragStarted() {
        const ellipse = d3.select( this );
        // ellipse.raise();
        ellipse.attr( 'cursor', 'grabbing' );
    }
    
    getTranslate( node ){
        const baseVal = node.transform.baseVal;
        if( baseVal.length > 0 ){
            const matrix = baseVal.getItem( baseVal.length - 1 ).matrix; 
            return { 'x':parseFloat( matrix.e ), 'y':parseFloat( matrix.f ) };
        } else {
            return { 'x':0, 'y':0 };
        }
    }

    dragged(event, d) {
        const selection = d3.select( this );        
        const translate = relationRenderer.getTranslate( selection.node() );
        const newX = translate.x + parseFloat( event.dx );
        const newY = translate.y + parseFloat( event.dy );
        d3.select( this ).attr( 'transform', `translate(${newX} ${newY})` );
    }
    
    dragEnded() {
        d3.select( this ).attr( 'cursor', 'grab' );
    }

    repairBaseTranslate( transform ) {
        transform = transform.translate( this.baseTransform.x, this.baseTransform.y );
        
        // Do this:
        // const newTransform = new d3.ZoomTransform( transform.k, transform.x, transform.y );
        // But this causes 'too much recursion' error.
        // d3.select( '#relation-graph' ).call( this.#zoom.transform, newTransform );

        // or this (but rather not):
        this.#svg.select( 'g' ).attr( 'transform', transform );
        
        // this.showPan();
    }

    // panRelationGraph( panXRatio=null ) {
    //     if( panXRatio != null  ) {
    //         const gExtent = this.#svg.select( 'g polygon' ).node().getBBox().width;
    //         const xTranslate = -1 * panXRatio * gExtent;
    //         var transform = d3.zoomTransform( this.#svg.select( 'g' ).node() );
    //         const newTransform = new d3.ZoomTransform( transform.k, transform.k*xTranslate, transform.y );
    //         d3.select( '#relation-graph' ).call( this.#zoom.transform, newTransform );
    //         this.showPan( panXRatio );
    //     }
    // }

    // showPan( panXRatio=0 ) {
    //     const transform = d3.zoomTransform( this.#svg.select( 'g' ).node() );
    //     const extentRatio = relationRenderer.calculateViewBoxExtentRatio( transform );
    //     console.log( '[relationRenderer.showPan] panXRatio:', panXRatio, (panXRatio != 0) );
    //     const panRatio = panXRatio == 0 ? panXRatio : relationRenderer.calculatePanXRatio( transform );
    //     console.log( '[relationRenderer.showPan] PANandEXTENT:', panRatio, extentRatio );
    //     // document.querySelector( 'node-density-chart' ).showPanPosition( panRatio, extentRatio );
    // }

    calculatePanXRatio( transform ) {
      const polygonElement = d3.select( '#relation-graph svg g polygon' );
      var panXRatio = 0;
      if( polygonElement.node() ) {
        const scale = transform.k;
        const xTranslate = transform.x;
        const gExtent = polygonElement.node().getBBox().width * scale;
        panXRatio = -( xTranslate / gExtent );
      }
      return panXRatio;
    }

    calculateViewBoxExtentRatio( transform ) {
      // We'll need scaling at some point.
      const scale = transform.k;
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
      // length in pixels * screenToViewBoxFactor gives you how much length the 
      // pixels represent in the coordinate system of the svg canvas.
      const screenToViewBoxFactor = svgViewBox.width/svgWidth;
      // How much we can see from the graph depends on the width of the 
      // div that contains the variant graph. The width of that
      // we want to express as a ratio of the width of the graph itself.
      // Note that this is not (yet, in this current code) the same as
      // svgWidth, as that doesn't resize.
      const relationGraphElementWidth = document.querySelector( '#relation-graph' ).getBoundingClientRect().width * (1/scale);
      const extent = relationGraphElementWidth * screenToViewBoxFactor;

      const polygonElement = d3.select( '#relation-graph svg g polygon' );
      var panExtentRatio = 0;
      if( polygonElement.node() ) {
        const gExtent = polygonElement.node().getBBox().width;
        panExtentRatio = extent / gExtent;
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
  