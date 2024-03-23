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
