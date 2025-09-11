class Edge {

    #edgeId;
    #path;
    #pathParent;
    #pathData;
    #bezierControls;
    #arrowHead;
    #WEST = 'west';

    constructor( edgeId ) {
        this.#edgeId = edgeId;
        this.#pathParent = document.querySelector( `#${this.#edgeId}` );
        this.#path = document.querySelector( `#${edgeId} path` );
        this.#pathData = this.#path.getPathData();
        const coords = this.reducePathData( this.#pathData );
        this.#bezierControls = this.coords2BezierControls( edgeId, coords );
        this.#arrowHead = document.querySelector( `#${edgeId} polygon` );
        this.adjustLongEdge();
    }

    get pathParent() {
        return this.#pathParent;
    }

    get bezierControls() {
        return this.#bezierControls;
    }

    toggleHighlight() {
        this.#pathParent.classList.toggle( 'highlighted' );
    }

    // This is for edge with id e39
    //
    // M316.54,-128.88C359.75,-132.03 427.87,-137.79 486.43,-146.2 503.81,-148.7 522.99,-152.31 538.9,-155.55
    // <svgPathSegmen><-------------svgPathSegment---------------> <-------------svgPathSegment------------->  pathData
    // [316.54,-128.88,359.75,-132.03,427.87,-137.79,486.43,-146.2,503.81,-148.7,522.99,-152.31,538.9,-155.55] Reduced to array
    //                                                                                                         Iterate overlapping window wise:
    // [316.54,-128.88,359.75,-132.03]  
    //  <start point > <contr. point> 
    //                               [427.87,-137.79,486.43,-146.2,503.81,-148.7] 
    //                                <contr. point> < end point > <contr.point>                                  
    //                                                                          [522.99,-152.31,538.9,-155.55]
    //                                                                           <contr. point> < end point >
    // So, to dissect that path data do:
    //      - reduce path data to array of coordinates
    //      - slice first four
    //      - slice last four 
    //      - iterate over remaining with step six


    reducePathData( pathData ) {
        return pathData.reduce( (acc,curr,index) => {
            const sgvPathElement = curr; 
            sgvPathElement.values.forEach( (value) => { acc.push( value ) } );
            return acc;
        }, [] );
    }

    coords2BezierControls( edgeId, coords ) {
        const bezierControls = [];

        const startCoords = [ 
            coords[2], coords[3], 
            coords[0], coords[1] 
        ];
        const startControl = new BezierControl( edgeId, startCoords ); 
        bezierControls.push( startControl );

        for (let i = 4; i <= coords.length - 6; i += 6) {
            // I tested below also with slicing and spreading, 
            // but that's twice as slow (0.004ms vs 0.009ms).
            const controlCoords = [ 
                coords[i], coords[i+1], 
                coords[i+2], coords[i+3], 
                coords[i+4], coords[i+5] 
            ];
            const control = new BezierControl( edgeId, controlCoords ); 
            bezierControls.push( control );
        }

        const coordsLength = coords.length;
        const endCoords = [ 
            coords[coordsLength-4], coords[coordsLength-3], 
            coords[coordsLength-2], coords[coordsLength-1] 
        ];
        const endControl = new BezierControl( edgeId, endCoords ); 
        bezierControls.push( endControl );
        
        return bezierControls;
    }

    adjustLongEdge() {
        const numControls = this.#bezierControls.length;
        if ( numControls > 3 ) {
            const pathDataA = this.#bezierControls[numControls-3].getPathData(); 
            const pathDataB = this.#bezierControls[numControls-2].getPathData(); 
            const bezierA = [ pathDataA[2], pathDataA[3] ];
            const bezierAControlB = [ pathDataA[4], pathDataA[5] ];
            const bezierBControlA = [ pathDataB[0], pathDataB[1] ];
            if ( objectsEqual( bezierA, bezierAControlB ) && objectsEqual( bezierA, bezierBControlA ) ) {
                this.#bezierControls[numControls-3].adjustControlB( pathDataA[2]-pathDataA[0] );
                this.#bezierControls[numControls-2].adjustControlA( pathDataB[2]-pathDataB[4] );
            };
        }
    }

    renderBezierControls() {
        this.#bezierControls.forEach( (bezierControl) => {
            bezierControl.render();
        } );
    }

    removeBezierControls() {
        this.#bezierControls.forEach( (bezierControl) => {
            bezierControl.remove();
        } );
    }

    moveEdgeEnd( dX, dY ) {
        // Move arrowhead.
        this.moveArrowHead( dX, dY );

        // Move edge end point Bezier control.
        const indexLastControl = this.#bezierControls.length - 1;
        const endPoint = this.#bezierControls[indexLastControl];
        endPoint.move( dX, dY );
        
        // TODO: (Enhancement.) It sits a little awkward with me that we 
        // need to manually update path after we have change Bézier points. 
        // Once a Bézier point change, the update should be automatic really.
        // But if one changes multiple Bézier points at once, one wants only
        // to update the Path once.
        // This could be done neatly by making `this.#bezierControls` in 
        // to a proper object or classes allowing for simultaneous updates.
        this.updatePath();
    }

    calculateTheta( pointX, pointY, rotationPointX, rotationPointY ) {
        return Math.atan2( (pointY-rotationPointY), ( pointX-rotationPointX) );
    }

    moveEdgeEndElastic( dX, dY ) {
        // Move arrowhead.
        this.moveArrowHead( dX, dY );
        // Move edge end point Bezier control.
        const controlIndex = this.#bezierControls.length - 1;
        this.moveEdgeEndPointElastic( dX, dY, controlIndex, stemmaWebUtils.WEST );
    }

    moveEdgeEndPointElastic( dX, dY, controlIndex, paddingDirection ) {
        const controlPoint = this.#bezierControls[controlIndex];
        controlPoint.moveElastic( dX, dY, paddingDirection );
        this.smooth( controlPoint );
    }

    smooth( controlPoint ) {
        if( this.#bezierControls.length > 2 ) {
            // the controls of the penultimate Bézier point
            // should move so that their connector is parallel to the line
            // that runs through this Bézier point and the very last one.
            const rotatingPoint = this.#bezierControls[ this.#bezierControls.length - 2 ];
            
            const controlPointData = controlPoint.getPathData();
            const rotatingPointData = rotatingPoint.getPathData();

            const pointX = controlPointData[2];
            const pointY = controlPointData[3];
            const rotationPointX = rotatingPointData[2];
            const rotationPointY = rotatingPointData[3];

            const thetaRad = this.calculateTheta( pointX, pointY, rotationPointX, rotationPointY );
            
            // const thetaDeg = thetaRad * 180 / Math.PI;
            //   -180 is North
            //    -90 is West
            //      0 is South
            //     90 is East
            //    180 is North
            //
            // This means if you find an angle of e.g. 60, one handle should point in that direction
            // the other should point in 60-180 = -120 

            rotatingPoint.rotate( thetaRad );
        }

        // TODO: see todo in `this.modeEdge`.
        this.updatePath() 
    }

    moveArrowHead( dX, dY ) {
        const selection = d3.select( this.#arrowHead );      
        const translate = stemmaWebUtils.getTranslate( selection.node(), dX, dY );
        selection.attr( 'transform', translate );
    }

    updatePath() {
        const firstControlPathData = this.#bezierControls[0].getPathData();
        const newMData = [ 
            firstControlPathData[2],
            firstControlPathData[3]
        ];
        let newCData = [
            firstControlPathData[0],
            firstControlPathData[1]
        ];

        this.#pathData[0].values = newMData;
        for ( let i = 1; i < this.#bezierControls.length; i += 1 ) {
            this.#bezierControls[i].getPathData().forEach( (cDatum) => {
                newCData.push( cDatum );
                if ( newCData.length % 6 == 0 ) {
                    this.#pathData[i].values = newCData; 
                    newCData = [];
                };
            } );
        }

        this.#path.setPathData( this.#pathData );
    }

    toOrigins( remove=false ) {

        const arrowHead = d3.select( this.#arrowHead );      
        arrowHead.transition().duration(500).attr( 'transform', 'translate(0 0)' );
        
        const firstControlPathData = this.#bezierControls[0].getOriginPathData();        
        const newMData = [ 'M', `${firstControlPathData[2]}`, `${firstControlPathData[3]}` ];
        let newCData = [ 'C', `${firstControlPathData[0]}`, `${firstControlPathData[1]}` ];
        // this.#pathData[0].values = newMData;
        for ( let i = 1; i < this.#bezierControls.length; i += 1 ) {
            this.#bezierControls[i].getOriginPathData().forEach( (cDatum) => {
                newCData.push( `${cDatum}` );
                if ( newCData.length % 7 == 0 ) {   // NB: Not 6, you have to account for the extra 'C' :-)
                    newCData.push( 'C' );
                };
            } );
        }
        const originPathData = newMData.concat( newCData ).join( ' ' );

        const path = d3.select( `#${this.#edgeId} path` );
        path.transition()
            .duration(500)
            .attr( 'd', originPathData )
            .on( 'end', () => {
                this.toggleHighlight();
            } );
        
        this.#bezierControls.forEach( (control) => { 
            control.toOrigins( 500 );
            remove && control.remove();
        } );
    }

}