class EdgeDragSpike extends HTMLElement {

    #relGvr = null;
    #baseTransform = '';
    #ACTIVATE = true;
    #DEACTIVATE = false;

    #svg = null;
    #zoom = null;
    
    constructor() {
        super();
    }
    
    connectedCallback() {
        const dot = global_dummy_dot_verbum;
        this.renderRelationsGraph( dot );
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
  
    computeSVGDimensions() {
        return { width: 1250, height: 575 }
    }

    /**
     * Renders the supplied variant and relation `dot` as a graph.
     *
     * @param {String} dot GraphViz DOT format description of the graph to display.
     * @param {Object} options
     */
    renderRelationsGraph( dot ) {
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
                
                // Added this to start the playing around.
                this.inspection();

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
                .scaleExtent([0.2, 2.5])
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
                } );
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
                        //NOTE: Changed call signature!
                        thisClassInstance.dragStarted.call( thisClassInstance, this, event, d );
                    } )
                    .on( 'end', function( event, d ) {
                        //NOTE: Changed call signature!
                        thisClassInstance.dragEnded.call( thisClassInstance, this, event, d );
                    } )
                    .on( 'drag', function( event, d ) { 
                        thisClassInstance.dragged.call( thisClassInstance, this, event, d ); 
                    } )
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

    // NOTE: changed
    dragStarted( element, event, d ) {
        const node = d3.select( element );
        // node.raise();
        node.attr( 'cursor', 'grabbing' );

        // Now select the new ones.
        // Note: d is the data on the svg g element that represents the node.
        this.#selectedEdges = this.selectEdges( d.key );
        this.#selectedEdges.forEach( (edge) => { 
            edge.toggleHighlight();
            if ( BEZIERS ) {
                edge.renderBezierControls();
            }
        } );
    }
    
    // NOTE: changed
    dragged( element, event, d ) {
        const dX = parseFloat( event.dx );
        const dY = parseFloat( event.dy );
        const selection = d3.select( element );        
        const translate = stemmaWebUtils.getTranslate( selection.node(), dX, dY );
        // d3.select( element ).attr( 'transform',  );
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

    repairBaseTranslate( transform ) {
        transform = transform.translate( this.baseTransform.x, this.baseTransform.y );
        
        // Do this:
        // const newTransform = new d3.ZoomTransform( transform.k, transform.x, transform.y );
        // But this causes 'too much recursion' error.
        // d3.select( '#relation-graph' ).call( this.#zoom.transform, newTransform );

        // or this (but according to d3 docs rather not, but how else if the above results in recursion?):
        this.#svg.select( 'g' ).attr( 'transform', transform );
    }


    // Above should be almost 100% identical to `relationRenderer` apart from…
    //  * deleting the things not used 
    //  * a slight changed to how `dragged` is called because this is an instantiated
    //    HTML componentobject and not a static-ish class like `Relationrenderer`.
    //  * and adding `this.inspection()` to the on end of `renderRelationsGraph( dot )`
    //    to start the playing around below.

    // Custom inspection and play around code below.
    #selectedEdges = [];

    inspection() {
    }

    selectEdges( key ) {
        const selected = [];
        const selection = d3.selectAll( '.edge' )
            .filter( (d) => {
                return ( key == d.key.split( '>' )[1] ); // { key: "22->39" … }
            } );
        selection.each( (d) => { 
            selected.push( new Edge( d.attributes.id ) );
        } );
        return selected;
    }

}

customElements.define( 'edge-drag-spike', EdgeDragSpike );

