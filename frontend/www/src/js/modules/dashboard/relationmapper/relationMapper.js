/**
 * @typedef {import('@types/stemmaweb').TraditionState} TraditionState
 *
 * @typedef {import('@types/stemmaweb').Tradition} Tradition
 * 
 */

/**
 * Class representing the all components and functions of the
 * relation mapper. 
 */
class RelationMapper extends HTMLElement {

    constructor() {
        super();
    }

    connectedCallback() {
        this.render();
    }

    /**
     * Adds relation edges to the variant graph.
     * 
     * @param {} data 
     *
     * Data objects of the existing graph (nodes) are of the form:
     *   Object { tag: "g", attributes: {…}, children: (7) […], parent: {…}, key: "1357", id: "svg-0.DEFAULT.1357" }
     * 
     * Data objects coming in are of the form:
     *   Object { id: "1357", section: "1347", rank: 5, text: "الحياة", witnesses: (2) […] }
     * 
     * So we can bind data on the key in the exiting node data and the id of the reading data coming in.
     * 
     */ 
    static addReadings( data ) {
        d3.select( '#relation-graph svg g' ).selectAll( 'g.node' )
            .data( data, function(d) { 
                return d.key ? d.key : d.id;
            } )
            .on( 'click',  (evt, d) => { document.querySelector( 'section-properties-view' ).showReadingProperties( d.id ) } );
    }

    /**
     * Adds relation edges to the variant graph.
     * 
     * @param {} data 
     */
    static addRelations( data ) {
        d3.select( '#relation-graph svg g' ).selectAll( 'g.relation' )
          .data( data )
          .enter()
          .call( this.draw_relation )
    }
 
    static getRandomColor() {
        const colors = [ '#a6cee3','#1f78b4','#b2df8a','#33a02c','#fb9a99','#e31a1c','#fdbf6f','#ff7f00','#cab2d6','#6a3d9a','#ffff99','#b15928' ]
        return colors[ Math.floor( Math.random() * colors.length ) ];
    }

    static createRelationId( source_id, target_id ) {
        var idlist = [source_id, target_id];
        idlist.sort();
        return 'relation-' + idlist[0] + '-' + idlist[1];
    }

    static draw_relation( sel ) {
        let classList = 'relation';
        let rels = sel.insert( 'g', 'g.node')
            .attr( 'id', d => RelationMapper.createRelationId( d.source, d.target ) )
            .attr( 'class', classList );
        rels.append( 'title' ).text( d => d.source + "->" + d.target);
        rels.append( 'path' )
            .attr('fill', 'none')
            // .attr('stroke', d => tempclass ? '#FFA14F' : relationship_types.find( x => x.name === d.type ).assigned_color )
            .attr('stroke', d => RelationMapper.getRandomColor() )
            .attr('stroke-width', d => d.is_significant === "yes" ? 6 : d.is_significant === "maybe" ? 4 : 2)
            .attr('d', d => {
                let source_el = d3.select( `#n${d.source}` ).select( 'ellipse' );
                let target_el = d3.select( `#n${d.target}` ).select( 'ellipse' );
                let rx = parseFloat( source_el.attr( 'rx' ) );
                let sx = parseFloat( source_el.attr( 'cx' ) );
                let ex = parseFloat( target_el.attr( 'cx' ) );
                let sy = parseFloat( source_el.attr( 'cy' ) );
                let ey = parseFloat( target_el.attr( 'cy' ) );
                let p = d3.path();
                p.moveTo( sx, sy );
                p.bezierCurveTo( sx + (2 * rx), sy, ex + (2 * rx), ey, ex, ey )
                return p;
            } )
            .style( 'cursor', 'pointer' );
    }
      
      
    render() {
        this.innerHTML = `
            <div id="relation-mapper-div" style="width:100%;">
                <section-selectors></section-selectors>
            </div>`
    }

}

customElements.define( 'relation-mapper', RelationMapper );