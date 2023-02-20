/**
 * Fades in an element in 0.5 seconds.
 * 
 * @param {HTMLElement} element 
 */
function fadeIn( element ){
    d3.select( element )
        .style('opacity', 0)
        .transition()
        .duration(500)
        .style('opacity', 1);
}
