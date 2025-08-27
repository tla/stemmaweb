class BezierControl {

    #pathParent;
    #svgBezierControl;
    #bezierPointData;
    #bezierPoint;
    #controlAData;
    #controlBData;
    #controlA;
    #controlB;
    #origins;

    #pointColor = 'FireBrick';
    #pointRadius = '3';
    #handleLineColor = 'OrangeRed';
    #handleControlColor = 'DodgerBlue';

    /**
     * Creates a visual representation for a control point on an SVG 
     * path. The control's data has the form of an array of six 
     * values corresponding to the x,y values of the control points. 
     * The value pairs are in order: first control point, Bézier point,
     * second control point. If the array contains only four values  
     * a Bézier control with only one control point is created.
     * 
     * @param {string}         xmlID of edge (svgPath)
     * @param {Array.<float>}  controlData 
     */
    constructor( edgeId, controlData ) {
        this.#pathParent = document.querySelector( `#${edgeId}` ); 
        this.#controlAData = [ controlData[0], controlData[1] ];
        this.#bezierPointData = [ controlData[2], controlData[3] ];
        this.#controlBData = ( controlData[4] != null ) && ( controlData[5] != null ) && [ controlData[4], controlData[5] ];
        this.#origins = {
            controlA: { 
                x: controlData[0], 
                y: controlData[1], 
                r: this.calculateR( this.#controlAData[0], this.#controlAData[1], this.#bezierPointData[0], this.#bezierPointData[1] )
            },
            bezierPoint: { 
                x: controlData[2], 
                y: controlData[3] 
            }
        }
        if( controlData[4] != null && controlData[5] != null ) {
            this.#origins.controlB = { 
                x:controlData[4], 
                y:controlData[5], 
                r: this.calculateR( this.#controlBData[0], this.#controlBData[1], this.#bezierPointData[0], this.#bezierPointData[1] )
            }
        }
    }

    adjustControlA( dX ) {
        this.adjustControl( this.#controlAData, this.#origins.controlA, dX );
    }

    adjustControlB( dX ) {
        this.adjustControl( this.#controlBData, this.#origins.controlB, dX );
    }

    adjustControl( controlData, controlOrigin, dX ) {
        controlData[0] = this.#bezierPointData[0] + dX;
        controlOrigin.x = controlData[0];
        controlOrigin.r = this.calculateR( controlData[0], controlData[1], this.#bezierPointData[0], this.#bezierPointData[1] );    
    }

    render() {
        this.#svgBezierControl = document.createElementNS( 'http://www.w3.org/2000/svg', 'g' );
        this.#controlA = this.appendHandle( this.#controlAData );
        this.#controlB = this.#controlBData && this.appendHandle( this.#controlBData );
        this.#bezierPoint = this.appendPoint();
        this.#pathParent.appendChild( this.#svgBezierControl );
    }

    appendPoint(){
        return this.appendCircle( this.#bezierPointData, this.#pointRadius, this.#pointColor );
    }

    appendHandle( controlPoint ) {
        return {
            stick: this.appendLine( this.#bezierPointData, controlPoint, this.#handleLineColor ),
            handle: this.appendCircle( controlPoint, this.#pointRadius, this.#handleControlColor ) 
        }
    }

    appendCircle( point, radius, color ) {
        const circle = document.createElementNS( 'http://www.w3.org/2000/svg', 'circle' );
        circle.setAttributeNS( null, 'cx', point[0] );
        circle.setAttributeNS( null, 'cy', point[1] );
        circle.setAttributeNS( null, 'r', radius );
        circle.setAttributeNS( null, 'fill', color );
        return this.#svgBezierControl.appendChild( circle );
    }

    appendLine( startPoint, endPoint, color ) {
        const line = document.createElementNS( 'http://www.w3.org/2000/svg', 'line' );
        line.setAttributeNS( null, 'x1', startPoint[0]  );
        line.setAttributeNS( null, 'y1', startPoint[1] );
        line.setAttributeNS( null, 'x2', endPoint[0] );
        line.setAttributeNS( null, 'y2', endPoint[1] );
        line.setAttributeNS( null, 'stroke', color );
        return this.#svgBezierControl.appendChild( line );
    }

    updateControl( control, controlData ) {
        control.handle.setAttributeNS( null, 'cx', controlData[0] );
        control.handle.setAttributeNS( null, 'cy', controlData[1] );
        control.stick.setAttributeNS( null, 'x2', controlData[0] );
        control.stick.setAttributeNS( null, 'y2', controlData[1] );        
    }

    updateBezierPoint() {
        this.#bezierPoint.setAttributeNS( null, 'cx', this.#bezierPointData[0] );
        this.#bezierPoint.setAttributeNS( null, 'cy', this.#bezierPointData[1] );
        this.updateControlStick( this.#controlA, this.#bezierPointData )
        if( this.#controlB ) {
            this.updateControlStick( this.#controlB, this.#bezierPointData );
        }
    }

    updateControlStick( control, controlData ) {
        control.stick.setAttributeNS( null, 'x1', controlData[0] );
        control.stick.setAttributeNS( null, 'y1', controlData[1] );        
    }


    /**
     * Updates the Bézier control. `controlData` is an array of
     * four or six values corresponding to the x,y values of
     * the first control point, the Bézier point, and the second
     * control point. If the Bézier control only contains one
     * controle point, the last two values in a six element
     * data array are ignored.
     *      
     * @param {Array.<float>} controlBData 
     */
    update( controlData ) {
        if ( ( controlData[0] != null ) && ( controlData[1] != null ) ) {
            this.#controlAData = [ controlData[0], controlData[1] ];
            this.#svgBezierControl && this.updateControl( this.#controlA, this.#controlAData );
        };
        if ( ( controlData[2] != null ) && ( controlData[3] != null ) ) {
            this.#bezierPointData = [ controlData[2], controlData[3] ];
            this.#svgBezierControl && this.updateBezierPoint();
        };
        if ( this.#controlBData && ( controlData[4] != null ) && ( controlData[5] != null ) ) {
            this.#controlBData = [ controlData[4], controlData[5] ];
            this.#svgBezierControl && this.updateControl( this.#controlB, this.#controlBData );
        };
    }

    /**
     * Translates the Bézier control and moves either control point, 
     * if present, according to the same translate. 
     * 
     * @param {float} dX  Amount to move the Bézier controls in the x dimension. 
     * @param {float} dY  Amount to move the Bézier controls in the y dimension. 
     */
    move( dX, dY ) {
        const newControlData = [
            this.#controlAData[0] + dX, this.#controlAData[1] + dY,
            this.#bezierPointData[0] + dX, this.#bezierPointData[1] + dY
        ]
        if( this.#controlBData ) {
            newControlData.push( [ this.#controlBData + dX, this.#controlBData + dY ] );
        }
        this.update( newControlData );
    }

    /**
     * Translates the Bézier control and moves either control point, 
     * if present, according to the same translate. 
     * A little extra negative x movement for the first control point 
     * is calculated. Applied to the last Bézier point this ensures 
     * that the incoming edge has a more smooth approach to the edge's 
     * arrow head, when the user moves a node (far) to the left.
     * 
     * @param {float} dX  Amount to move the Bézier controls in the x dimension. 
     * @param {float} dY  Amount to move the Bézier controls in the y dimension. 
     */
    moveElastic( dX, dY ) {
        const newControlData = [
            this.#controlAData[0] + dX, this.#controlAData[1] + dY,
            this.#bezierPointData[0] + dX, this.#bezierPointData[1] + dY
        ]
        if( this.#controlBData ) {
            newControlData.push( [ this.#controlBData + dX, this.#controlBData + dY ] );
        }

        // For the added negative x movement we need to know how far the 
        // control and Bézier point initially were apart.
        let initalDistance = this.#origins.bezierPoint.x - this.#origins.controlA.x;

        // We also need to know how far the Bézier point is now from its origin.
        const xBezierPoint = newControlData[2];
        let distanceBezierPointToOrigin = this.#origins.bezierPoint.x - xBezierPoint;

        // Tha extra 'padding' is a function of how far the Bezier point is 
        // currently from its origin. It adds substantial at first, but less 
        // to nothing when dragged far to the left. 
        let handlePaddingX = Math.sqrt( 10*distanceBezierPointToOrigin ) || 0;

        // Finally we compute where the control should go on the x dimension.
        const xControl  = xBezierPoint - initalDistance - handlePaddingX;

        // And we update everything.
        newControlData[0] = xControl;
        this.update( newControlData );
    }

    calculateR( x1, y1, x2, y2 ) {
        const dimX = x1-x2;  // TODO: Note: same as initialDistance above; we probably should extract these values;
        const dimY = y2-y1;
        return Math.sqrt( dimX**2 + dimY**2 );
    }

    rotate( thetaRad ){
        const bx = this.#bezierPointData[0];
        const by = this.#bezierPointData[1];
        const xControlA = bx - ( Math.cos( thetaRad ) * this.#origins.controlA.r );
        const yControlA = by - ( Math.sin( thetaRad ) * this.#origins.controlA.r );
        if( this.#controlBData ) {
            const xControlB = bx + ( Math.cos( thetaRad ) * this.#origins.controlB.r );
            const yControlB = by + ( Math.sin( thetaRad ) * this.#origins.controlB.r );
            this.update( [ xControlA, yControlA, null, null, xControlB, yControlB ] );
        }
    }

    // Because the returning of the node and edges to their original 
    // position (i.e. when the user release the node) is quick and 
    // automatic, we do not bother with precisely moving and rotating 
    // we just use D3 to animate the translate back to origin.
    toOrigins( duration ) {
        if ( this.#controlA ) {  // TODO: I.e. if visible (rendered). Probably there's a cleaner solution.
            d3.select( this.#controlA.handle ).transition().duration( duration )
                .attr( 'cx', this.#origins.controlA.x )
                .attr( 'cy', this.#origins.controlA.y );
            d3.select( this.#controlA.stick ).transition().duration( duration )
                .attr( 'x1', this.#origins.bezierPoint.x )
                .attr( 'y1', this.#origins.bezierPoint.y )
                .attr( 'x2', this.#origins.controlA.x )
                .attr( 'y2', this.#origins.controlA.y )
                .on( 'end', () => { 
                    // this.remove() 
                } );
            d3.select( this.#bezierPoint ).transition().duration( duration )
                .attr( 'cx', this.#origins.bezierPoint.x )
                .attr( 'cy', this.#origins.bezierPoint.y );
            if( this.#controlB ) {
                d3.select( this.#controlB.handle ).transition().duration( duration )
                    .attr( 'cx', this.#origins.controlB.x )
                    .attr( 'cy', this.#origins.controlB.y );
                d3.select( this.#controlB.stick ).transition().duration( duration )
                    .attr( 'x1', this.#origins.bezierPoint.x )
                    .attr( 'y1', this.#origins.bezierPoint.y )
                    .attr( 'x2', this.#origins.controlB.x )
                    .attr( 'y2', this.#origins.controlB.y );
                }
        }
    }

    remove() {
        this.#svgBezierControl.remove();
    }

    getPathData() {
        let pathSegmentData = this.#controlAData.concat( this.#bezierPointData );
        this.#controlBData && ( function() {
            pathSegmentData = pathSegmentData.concat( this.#controlBData );
        }.call( this ) );
        return( pathSegmentData );
    }

    getOriginPathData() {
        let pathSegmentData = [ this.#origins.controlA.x, this.#origins.controlA.y ]
            .concat( [ this.#origins.bezierPoint.x, this.#origins.bezierPoint.y ] );
        this.#controlBData && ( function() {
            pathSegmentData = pathSegmentData.concat( [ this.#origins.controlB.x, this.#origins.controlB.y ] );
        }.call( this ) );
        return( pathSegmentData );
    }
}
