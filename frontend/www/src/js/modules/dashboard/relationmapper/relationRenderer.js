class RelationRenderer {

    #relGvr = null;
    #baseTransform = '';
    #ACTIVATE = true;
    #DEACTIVATE = false;

    #svg = null;
    #zoom = null;
    
    #selectedEdges = [];

    constructor() {
        // This is the listener that catches a user dragging the 
        // position indicator in the minimap.
        this.unsubscribePanListener = broadcast.subscribe( 'minimapPan', (eventData) => {
            this.panRelationGraph( eventData );
        } );
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
        const svgDimensions = this.computeSVGDimensions();
        this.relationMapperGraphvizRoot
            .width( svgDimensions.width )
            .height( svgDimensions.height )
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
                this.graphNodesDrag( this.#ACTIVATE );

                d3.select( window )
                    .on( 'keydown', (event) => { this.onKeyDown.call( this, event ) } )
                    .on( 'keyup', (event) => { this.onKeyUp.call( this, event ) } );

                // When a new graph is loaded we need to 'reset' the zoom.
                // Otherwise the newly depicted section's graph will "jump" 
                // (i.e. use the existing transform).
                d3.select( '#relation-graph' ).call( this.#zoom.transform, d3.zoomIdentity );

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
                // TODO:
                // .translateExtent( [[0,-200],[2000,800]] )
                // We will have to think about translateExtent:
                //   1) It depends on the height and length of the graph
                //   2) It depends on zoom 
                //        a) Setting limits to just height-and-a-bit 
                //           and width-and-a-bit of the graph results
                //           in barely being able to move the graph inside 
                //           the window when majorly zoomed out.
                //        b) But setting very large limits
                //           allows to pan 'out of' the window area.
                //
                // `this` is always the object that owns the call, which is `#the-graph-container`
                // in this case. But we want this to be `the-graph`, hence we use `.call` to
                // pass the right 'owner' into the zoomed function. See also
                // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/call
                .on( 'zoom', ( {transform, sourceEvent } ) => { 
                    this.repairBaseTranslate.call( this, transform );
                    // In case minimap requested a pan `transform.silent` exists.
                    // In that case we won't broadcast an event, as it would cause the
                    // minimap to rerender the indicator (which it already did.)
                    if( transform.silent === undefined ) {
                        // We handle this as a promise because the very first render by GrapViz.js takes just a tad
                        // too long and the pan ratio comes out as NaN because the svg has not been added to the dom
                        // or something such; `calculatePanZoomRatios` waits for it to appear.
                        // We only have to do this if sourceEvent of the zoom event is null, which means the zoom/pan
                        // was caused by the code and not by a user scrolling, clicking, wheeling, etc.
                        const resolveImmediately = ( sourceEvent != null );
                            this.calculatePanZoomRatios( resolveImmediately ).then( (ratios) => { broadcast.publish( 'relationGraphPanZoom', ratios ) } );    
                        }
                    }
                );
            d3.select( '#relation-graph' ).call( this.#zoom );
        } else {
            d3.select( '#relation-graph' ).on( '.zoom', null );
        };
    }

    graphNodesDrag( draggable ) {
        if( draggable ){
            const thisClassInstance = this;
            this.#svg.selectAll( 'g.node' )
                .attr( 'cursor', 'grab' )
                .call( d3.drag()
                    .on( 'start', function( event, d ) {  
                        thisClassInstance.dragStarted.call( thisClassInstance, this, event, d );
                    } )
                    .on( 'end', function( event, d ) {
                        thisClassInstance.dragEnded.call( thisClassInstance, this, event, d );
                    } )
                    .on( 'drag', function( event, d ) { 
                        thisClassInstance.dragged.call( thisClassInstance, this, event, d ); 
                    } )
                );
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
                                const gNodes = this.#svg.selectAll( 'g g.node' );
                                gNodes.each( (d,i,nodes) => {
                                    const gNode = d3.select( nodes[i] );
                                    // What is the 'extent' of the brush mask in the svg coordinate space?
                                    const [ x0Svg, y0Svg ] = this.viewboxCoordinates2SVGCoordinates( [x0, y0] );
                                    const [ x1Svg, y1Svg ] = this.viewboxCoordinates2SVGCoordinates( [x1, y1] );
                                    // What is de center x and y of an ellips in that space?
                                    const ellipse = gNode.select( 'ellipse' ).node();
                                    if( ellipse ) {
                                        const ellipseCenter = this.getEllipseCenter( ellipse );
                                        const cxEllipse = ellipseCenter.x + this.baseTransform.x; 
                                        const cyEllipse = ellipseCenter.y + this.baseTransform.y;
                                        // Does de mask cover the center of the ellipse (datum)? 
                                        if ( cxEllipse>=x0Svg &&  cxEllipse<=x1Svg && cyEllipse>=y0Svg && cyEllipse<=y1Svg ) {
                                            gNode.classed( 'selected', true );
                                        } else {
                                            gNode.classed( 'selected', false );
                                        };
                                    }
                                } );
                            }
                        } 
                    )
                    .on( 'end', (event) => {
                            const selection = d3.select( '#relation-graph svg g' ).selectAll( 'g.node.selected' );
                            if ( selection.size() > 1 ) {
                                document.querySelector( 'reading-properties-view' ).showMultiReadingProperties( selection );
                            } else {
                                if ( !selection.empty ) {
                                    const d = selection.datum();
                                    document.querySelector( 'reading-properties-view' ).showReadingProperties( d.id );
                                }
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

    dragStarted( element, event, d ) {
        const node = d3.select( element );
        node.raise();
        node.attr( 'cursor', 'grabbing' );

        // Now select the new ones.
        // Note: d is the data on the svg g element that represents the node.
        this.#selectedEdges = this.selectInEdges( d.id );
        this.#selectedEdges.push( ...this.selectOutEdges( d.id ) );
        this.#selectedEdges.push( ...this.selectRelations( d.id ) );
        this.#selectedEdges.forEach( (edge) => { 
            edge.toggleHighlight();
            if ( BEZIERS ) {
                edge.renderBezierControls();
            }
        } );
    }
    
    dragged( element, event, d ) {
        const dX = parseFloat( event.dx );
        const dY = parseFloat( event.dy );
        const selection = d3.select( element );        
        const translate = stemmaWebUtils.getTranslate( selection.node(), dX, dY );
        selection.attr( 'transform', translate );

        this.#selectedEdges.forEach( (edge) => { 
            edge.moveEdgeEndElastic( dX, dY );
        } );
    }
    
    dragEnded( element, event, d ) {
        const node = d3.select( element );
        node.attr( 'cursor', 'grab' );
 
        const selection = d3.select( element );        

        selection.transition().duration(500).attr( 'transform', 'translate(0 0)' );

        this.#selectedEdges.forEach( (edge) => { 
            if( BEZIERS ) {
                edge.toOrigins( true );
            } else {
               edge.toOrigins();
            }
        } );
        this.#selectedEdges = [];
    }

    selectInEdges( nodeId ) {
        const selected = [];
        const selection = d3.selectAll( '.edge' )
            .filter( (d) => {
                return ( nodeId == d.key.split( '>' )[1] ); // { key: "22->39" … }
            } );
        selection.each( (d) => { 
            selected.push( new InEdge( d.attributes.id ) );
        } );
        return selected;
    }

    selectOutEdges( nodeId ) {
        const selected = [];
        const selection = d3.selectAll( '.edge' )
            .filter( (d) => {
                return ( nodeId == d.key.split( '-' )[0] ); // { key: "22->39" … }
            } );
        selection.each( (d) => { 
            selected.push( new OutEdge( d.attributes.id ) );
        } );
        return selected;
    }

    selectRelations( nodeId ) {
        const selected = [];
        const selection = d3.selectAll( '.relation' )
            .filter( (d) => {
                return ( nodeId == d.source || nodeId == d.target ); // { source: "2580", target: "2581", id: "4574", … }
            } );
        selection.each( (d,i,nodes) => { 
            if( nodeId == d.source ) {
                selected.push( new RelationEdge( nodes[i].id ) );
            } else {
                selected.push( new RelationEdge( nodes[i].id, stemmaWebUtils.REVERSE ) );
            }
        } );
        return selected;
    }

    repairBaseTranslate( transform ) {
        transform = transform.translate( this.baseTransform.x, this.baseTransform.y );
        
        // Do this:
        // const newTransform = new d3.ZoomTransform( transform.k, transform.x, transform.y );
        // But this causes 'too much recursion' error.
        // d3.select( '#relation-graph' ).call( this.#zoom.transform, newTransform );

        // or this (but according to d3 docs rather not, but how else if the above results in recursion?):
        this.#svg.select( 'g' ).attr( 'transform', transform );
    }

    panRelationGraph( eventData ) {        
        if( eventData.panXRatio && eventData.panXRatio != null  ) {
            const gExtent = this.#svg.select( 'g polygon' ).node().getBBox().width;
            const xTranslate = -1 * eventData.panXRatio * gExtent;
            var transform = d3.zoomTransform( this.#svg.select( 'g' ).node() );
            const newTransform = new d3.ZoomTransform( transform.k, transform.k*xTranslate, transform.y );
            newTransform.silent = eventData.silent;
            d3.select( '#relation-graph' ).call( this.#zoom.transform, newTransform );
        }
    }

    calculatePanZoomRatios( resolveImmediately ) {
        // We use a promise to repeatedly calculate panXRatio until it does return a
        // useful value. This is necessary because the first SVG rendered by GraphViz.js 
        // takes just a tiny bit too long to arrive in the DOM and then panXRatio 
        // returns as NaN.
        // We only have to do this if the sourceEvent of the zoom event was null, which 
        // means the zoom/pan was caused by the code and not by a user scrolling, 
        // clicking, wheeling, etc. The parameter `resolveImmediately` may be used to
        // indicate this.
        if( resolveImmediately ) {
            return new Promise( resolve => {
                const { panXRatio, transform } = relationRenderer.calculateZoomPanXRatio();
                const panExtentRatio = relationRenderer.calculateZoomPanExtentRatio( transform );
                resolve( { panXRatio: panXRatio, panExtentRatio: panExtentRatio } );
            } );
        } else {
            return new Promise( resolve => {
                const theInterval = setInterval( function () {
                    const { panXRatio, transform } = relationRenderer.calculateZoomPanXRatio();
                    if( panXRatio != null ) {
                        clearInterval( theInterval );
                        const panExtentRatio = relationRenderer.calculateZoomPanExtentRatio( transform );
                        resolve( { panXRatio: panXRatio, panExtentRatio: panExtentRatio } );
                    }
                }, 10);
            } );
        }
    }

    calculateZoomPanXRatio() {
        const polygonElement = d3.select( '#relation-graph svg g polygon' );
        const transform = d3.zoomTransform( this.#svg.select( 'g' ).node() );
        var panXRatio = null;
        if( polygonElement.node() ) {
            const scale = transform.k;
            const xTranslate = transform.x;
            const gExtent = polygonElement.node().getBBox().width * scale;
            panXRatio = -( xTranslate / gExtent );
        }
        return { panXRatio: panXRatio, transform: transform };
    }

    calculateZoomPanExtentRatio( transform ) {
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
    }

    computeSVGDimensions() {
        const width = document.querySelector( '#topbar-menu' ).getBoundingClientRect().width;
        const sectionSelectorsHeight = document.querySelector( 'section-selectors' ).getBoundingClientRect().height;
        // Initially `#relation-mapper-div` is display none, so `.getBoundingClientRect()` will
        // not work. But `getComputedStyle` does.
        const height = parseFloat( window.getComputedStyle( document.querySelector( '#relation-mapper-div' ) ).height ) - sectionSelectorsHeight;
        return { width: width, height: height }
    }

    /**
     * Resizes the current graph/stemma when the browser window gets 
     * resized. Also sets the new corresponding width on the GraphViz 
     * renderer so that subsequent relation graphs are depicted at 
     * the right size.
     */
    resizeSVG() {
        // // TODO: only on visible?
        const svgDimensions = relationRenderer.computeSVGDimensions();
        const relationGraph = d3.select( '#relation-graph' );
        const svg = relationGraph.selectWithoutDataPropagation("svg");
        svg
            .transition()
            .duration(700)
            .attr("width", svgDimensions.width )
            .attr("height", svgDimensions.height );
    }

}
  
const relationRenderer = new RelationRenderer();
window.addEventListener( 'resize', relationRenderer.resizeSVG );
  