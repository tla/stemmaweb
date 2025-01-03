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

function crossFade( elementIn, elementOut=null, options={} ){
  const defaults = { 'display': 'flex', 'duration': 1000, 'onEnd': null };
  const usedOptions = { ...defaults, ...options };
  if( elementOut ) {
    var elemIn = d3.select( elementIn );
    var elemOut = d3.select( elementOut );
    var stepDuration = usedOptions.duration / 2;
    elemOut
      .transition()
      .duration( stepDuration )
      .style( 'opacity',  0 )
      .on( 'end', () => {
        elemOut.style( 'display', 'none' );
        elemIn
          .style( 'display', usedOptions.display )
          .transition()
          .duration( stepDuration )
          .style( 'opacity', 1 )
          .on( 'end', usedOptions.onEnd );
      })
  }
}

function fadeToDisplayFlex( element, options ){
  const defaultOptions = { 'duration': 500, 'delay': 0, 'onEnd': null };
  const usedOptions = { ...defaultOptions, ...options };
  d3.select( element )
    .style( 'display', 'flex' )
    .transition()
    .duration( usedOptions.duration )
    .style( 'opacity', 1 )
    .on( 'end', () => {
      if ( usedOptions.onEnd ) { 
        usedOptions.onEnd();
      }
    } );
}

function fadeToDisplayNone( element, options={} ){
  const defaultOptions = { 'duration': 500, 'delay': 0, 'reverse': false, 'onEnd': null };
  const usedOptions = { ...defaultOptions, ...options };
  if( !options.reverse ) {
    d3.select( element )
      .transition()
      .delay( usedOptions.delay )
      .duration( usedOptions.duration )
      .style( 'opacity',  0 )
      .on( 'end', () => {
        d3.select( element ).style( 'display', 'none' );
        if( usedOptions.onEnd ){ 
          usedOptions.onEnd();
        }
    } );
  } else {
    d3.select( element ).node().style.removeProperty( 'display' )
    d3.select( element )
      .transition()
      .delay( usedOptions.delay )
      .duration( usedOptions.duration )
      .style( 'opacity',  1 )
      .on( 'end' , () => { 
        if( usedOptions.onEnd ) {
          usedOptions.onEnd();
        }
      } );
  }
}
