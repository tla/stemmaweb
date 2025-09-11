class OutEdge extends InEdge {

    constructor( edgeId ) {
        super( edgeId );
    }

    toggleHighlight() {
        this.pathParent.classList.toggle( 'highlighted' );
        this.pathParent.classList.toggle( 'outbound' );
    }

    calculateTheta( pointX, pointY, rotationPointX, rotationPointY ) {
        return Math.atan2( (rotationPointY-pointY), (rotationPointX-pointX) );
    }

    moveEdgeEndElastic( dX, dY ) {
        const controlIndex = 0;
        this.moveEdgeEndPointElastic( dX, dY, controlIndex, stemmaWebUtils.EAST );
    }

}