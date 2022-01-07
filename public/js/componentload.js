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
  d3.select("#graph")
   .graphviz()
    .renderDot('digraph {a -> b -> c}');
}
