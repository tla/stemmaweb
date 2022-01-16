function fetchTraditions() {
  fetch( '/api/traditions' )
  .then( resp => resp.json() )
  .then( data => {
    let traditions_list = d3.select( '#traditions_list' )
      .selectAll( 'li' )
      .data( data, d => d.id );
    traditions_list.exit().remove();
    traditions_list = traditions_list.enter()
      .append( 'li' )
      .merge( traditions_list );
    traditions_list.classed( 'nav-item', true );
    links = traditions_list.append( 'a' )
      .classed( 'nav-link', true )
      .attr( 'trad-id', d => d.id  )
      .attr( 'href', function( d ){
        return 'api/tradition/' + d.id;
      });
    links.html( feather.icons[ 'file-text' ].toSvg() );
    links.append( 'span' ).text( d => d.name );
    links.on( 'click', getTradition );
  })};

function getTradition( evt ) {
  evt.preventDefault();
  var d = d3.select( this ).datum();
  console.log( d );
  fetch( 'api/tradition/' + d.id + '/stemmata' )
  .then( resp => resp.json() )
  .then( data => {
    d3.select( '#graph_area' )
      .graphviz()
      .width( d3.select( '#graph_area' ).node().getBoundingClientRect().width ).height(500)
      .fit( true )
      .renderDot( data[0].dot );
  })
  .then( d3.select( '#tradition_name' ).text( d.name ) )
  .then( [
      [ 'Owner', d.owner ],
      [ 'Is public', d.is_public ],
      [ 'Language', d.language ],
      [ 'Witnesses', d.witnesses ]
    ].forEach( function( item ){
      var tr = d3.select( '#tradition_info' ).append( 'tr' )
      tr.append( 'td' )
        .text( item[0] )
      tr.append( 'td' )
        .text( item[1] )
      })
  )
};

( function() {
    fetchTraditions();
    feather.replace( { 'aria-hidden': 'true' } )
} )()
