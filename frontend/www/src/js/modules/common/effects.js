/**
 * Fades in an element in 0.5 seconds.
 * 
 * @param {HTMLElement} element 
 */
function fadeIn( element ){
  d3.select( element )
    .style('opacity', 0 )
    .transition()
    .duration( 1000 )
    .style( 'opacity',  1);
}

function mellow_transition(transition) {
  return transition.delay( 50 ).duration( 1000 ).ease( d3.easeLinear );
}

function speedy_transition(transition) {
  return transition.delay( 25 ).duration( 150 ).ease( d3.easeLinear );
}

function crossFade( elementIn, elementOut=null, options={ 'display': 'flex', 'duration': 1000 } ){
  if( elementOut ) {
    var elemIn = d3.select( elementIn );
    var elemOut = d3.select( elementOut );
    var duration = options.duration/2;
    console.log( duration, options.display );
    elemOut
      .transition()
      .duration( duration )
      .style( 'opacity',  0)
      .on( 'end', () => {
        elemOut.style( 'display', 'none' );
        elemIn
          .style( 'display', options.display )
          .transition()
          .duration( duration )
          .style( 'opacity', 1 );
      })
  }
}

function fadeToDisplayFlex( element ){
  d3.select( element )
    .style( 'display', 'flex' )
    .transition()
    .duration( 1000 )
      .style( 'opacity', 1 );
}
