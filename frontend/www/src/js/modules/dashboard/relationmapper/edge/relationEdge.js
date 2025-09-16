class RelationEdge extends InEdge {

    #indexLastControl = 0;

    constructor( edgeId, reverse ) {
        super( edgeId );
        if( reverse == stemmaWebUtils.REVERSE ) {
            this.#indexLastControl = this.bezierControls.length - 1;
        }
    }

    // Is highlighting relations useful?
    toggleHighlight() {
        // this.pathParent.classList.toggle( 'highlighted' );
        // this.pathParent.classList.toggle( 'outbound' );
    }

    // In fact not an elastic move, but that over ridden
    // with a dumbed down version that merely moves the
    // end/start point with the dragged node. Seems it suffices?
    moveEdgeEndElastic( dX, dY ) {
        // Move edge end point Bezier control.
        const endPoint = this.bezierControls[this.#indexLastControl];
        endPoint.move( dX, dY );
        this.updatePath();
    }

}