( function() {

    const svg_slide_indicator = '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>';
    const svg_slide_indicator_active = '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="12" viewBox="0 0 24 24" fill="rgb(180,180,180)" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle></svg>';

    function mellow_transition( transition ) {
      return transition
        .delay( 50 )
        .duration( 1000 )
        .ease( d3.easeLinear );
    }

    function quick_cut_transition( transition ) {
      return transition
        .delay( 0 )
        .duration( 100 )
        .ease( d3.easeLinear );
    }

    function quick_fade_in( sel ) {
      return sel.style( 'opacity', 0 )
        .transition().duration( 500 )
        .style( 'opacity', 1 )
    }

    function fetch_traditions() {
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
        links.on( 'click', get_tradition );
      })};


    function get_tradition( evt ) {
      evt.preventDefault();
      var d = d3.select( this ).datum();
      fetch( 'api/tradition/' + d.id + '/stemmata' )
      .then( resp => resp.json() )
      .then( data => {
        // console.log( data );
        var graph_area = d3.select( '#graph_area' );
        // After getting the stemmata data we subdue the graph area
        // so we can paint on it unseen and then fade it in
        graph_area.style( 'opacity', '0.0' )
        graph_area.select( '*' ).remove();
        var graph_div = graph_area.append( 'div' );
        graph_div.style( 'height', '100%' );
        // Here we put in the slide indeicators that will allow the user to
        // switch to different stemmas.
        var stemma_selector = d3.select( '#stemma_selector');
        stemma_selector.selectAll( '*' ).remove();
        stemma_selector.selectAll( 'span' )
          .data( data )
          .enter()
          .append( 'span' )
            .html( function( d, i ) {
              var svg = svg_slide_indicator;
              if( i == 0 ) {
                svg = svg_slide_indicator_active;
              }
              return svg
            } )
            .on( 'click', function( evt ){
              // Add eventlisteners to slide indicators that will update the
              // indicators and render the newly chosen stemma.
              d3.selectAll( '#stemma_selector span svg' ).style( 'fill', 'rgb(255,255,255)' );
              d3.select( this ).select( 'svg' ).style( 'fill', 'rgb(180,180,180)' );
              var next_dot = d3.select( this ).datum().dot;
              graph_area.transition()
                .call( quick_cut_transition ).style( 'opacity', '0.0' )
                .on( 'end', function() { graph_viz.renderDot( next_dot ) } );
              set_downloads( next_dot );
            } );
        // The work horse, graphviz puts in the first stemma here,
        // and we have some mild transitions for posh fade in.
        graph_viz = graph_div.graphviz()
          .width( graph_div.node().getBoundingClientRect().width )
          .height( graph_div.node().getBoundingClientRect().height )
          .fit( true )
          // NB Failed approach notice…
          // This causes a slower transition, but the graph still 'drops in'.
          // It just slows *all* transitions. I wish I knew why the butt ugly
          // 'drop in' has been selected as the default undefaultable transition.
          // .transition( function(){ return mellow_transition( d3.transition() ) } )
          .on( 'renderEnd', function() { graph_area.transition().call( mellow_transition ).style( 'opacity', '1.0' ) }  )
          .on( 'initEnd', function() { graph_viz.renderDot( data[0].dot ) } );
        set_downloads( data[0].dot );
      })
      .then( d3.select( '#tradition_name' )
        .call( quick_fade_in ).text( d.name ) )
      .then( function() {
        // After putting in the stemma and the title of the tradition
        // we put in the metadata of the stemma.
        d3.select( '#tradition_info' ).selectAll( '*' ).remove();
        [
          [ 'Owner', d.owner ],
          [ 'Is public', d.is_public ],
          [ 'Language', d.language ],
          [ 'Witnesses', d.witnesses ]
        ].forEach( function( item ) {
          var tr = d3.select( '#tradition_info' ).append( 'tr' );
          tr.append( 'td' ).text( item[0] );
          tr.append( 'td' ).text( item[1] );
        } );
      } )
    };


    function set_downloads( dot ) {
      d3.select( '#download_dot' ).on( 'click', function( evt ) {
        evt.preventDefault();
        download( 'stemma.dot', dot, 'text/plain' )
      } )
      d3.select( '#download_svg' ).on( 'click', function( evt ) {
        evt.preventDefault();
        download( 'stemma.svg', d3.select( '#graph_area div' ).html(), 'image/svg+xml' )
      } )
      d3.select( '#download_png' ).on( 'click', function( evt ) {
        evt.preventDefault();
        saveSvgAsPng( d3.select( '#graph_area div' ).select( 'svg' ).node(), "stemma.png");
      } )
    }


    function download( filename, data, mime_type ) {
        const blob = new Blob( [data], {type: mime_type} );
        if( window.navigator.msSaveOrOpenBlob ) {
            window.navigator.msSaveBlob( blob, filename );
        } else {
            const elem = document.createElement( 'a' );
            elem.href = URL.createObjectURL( blob );
            elem.download = filename;
            document.body.appendChild( elem );
            elem.click();
            document.body.removeChild( elem );
        }
    }


    // 'Main'
    fetch_traditions();
    feather.replace( { 'aria-hidden': 'true' } )

} )()
