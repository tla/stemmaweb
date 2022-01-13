function fetchTraditions() {
  fetch ('/api/traditions')
  .then(resp => resp.json())
  .then(data => {
    let tlist = d3.select('#traditionList')
      .selectAll('li')
      .data(data, d => d.id);
    tlist.exit().remove();
    tlist = tlist.enter()
      .append('li')
      .merge(tlist);
    tlist.attr("tradId", d => d.id)
      .text(d => d.name);
  })};

function testD3Graphviz() {
  fetch( 'api/tradition/577e139f-1829-414a-a54c-ad3a2447282f/stemmata' )
  .then( resp => resp.json() )
  .then( data => {
    d3.select( "#graph" )
      .graphviz()
      .renderDot( data[0].dot );
    console.log( data[0].dot );
    console.log( data )
  })
};

// d3.select("#graph")
//  .graphviz()
//   .renderDot('digraph {a -> b -> c}');
// }
