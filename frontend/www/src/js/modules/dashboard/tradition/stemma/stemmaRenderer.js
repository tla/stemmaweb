class StemmaRenderer {

  constructor() {
  }

  /**
   * @param {string} dot
   * @returns {string}
   */
  ellipse_border_to_none( dot ) {
    return dot.replace(
      '" {',
      '" {\n\t node [color=none style=filled fillcolor=white]'
    );
  }

  // Todo: stemmaweb.js should eventually use this too!!
  render_stemma( stemma_dot ) {
    const graphArea = d3.select('#graph-area');
    graphArea.select('*').remove();
    const graph_root = graphvizRoot();
    graph_root.renderDot( this.ellipse_border_to_none( stemma_dot ) );
  }

}

const stemmaRenderer = new StemmaRenderer();