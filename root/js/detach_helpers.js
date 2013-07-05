function edges_of( ellipse ) {
  var edges = new Array();
  var node_id = ellipse.parent().attr('id');
  var edge_in_pattern = new RegExp( node_id + '$' );
  $.each( $('#svgenlargement .edge'), function(index) {
      title = $(this).children('title').text();
      if( title.search( node_id ) > -1 ) {
          var edge = new Edge( $(this) );
          edge.node_id = node_id;
          if( edge_in_pattern.test(title) ) {
              edge.is_incoming  = true;
          }
          edges.push( edge );
      }
  } );
  return edges;
}

function Edge( g_elem ) {
    
    var self = this;
    
    this.g_elem = g_elem;
    this.witnesses = g_elem.children('text').text().split( /,\s*/ );
    this.is_incoming = false;
    
    this.detach_witnesses = function( witnesses_to_detach ) {
        var detached = [];
        var left = '';
        var clone = null;
        $.each( witnesses_to_detach, function( index, witness_to_detach ) {
            witness_index = self.witnesses.indexOf( witness_to_detach );
            if( witness_index > -1 ) {  
                self.witnesses.splice( witness_index, 1 );
                detached.push( witness_to_detach );
            }
        } );
        if( detached != '' ) {
            clone = self.clone_for( detached );
        }
        var remaining = self.create_label( self.witnesses );
        if( remaining == '' ) {
            self.g_elem.remove();
        } else {
            self.g_elem.children('text').text( remaining );
        }
        return clone;
    }
    
    this.get_label = function() {
        return self.g_elem.children('text').text();
    }
    
    this.create_label = function( witnesses ) {
        var label = '';
        $.each( witnesses, function( index, witness ) {
            label = label + witness + ', ';
        } );
        label = label.replace( /, $/, '' );
        return label;
    }
    
    this.clone_for = function( witnesses ) {
        var label = self.create_label( witnesses );
        var clone = g_elem.clone();
        clone.children('text').text( label );
        var duplicate_data = g_elem.data( 'repositioned' );
        if( duplicate_data != null ) {
            clone.data( 'repositioned', duplicate_data );
        }
        clone = new Edge( clone );        
        clone.is_incoming = self.is_incoming;
        return clone;
    }
    
    this.attach = function( node_id_maybe ) {
        //update title
        return null;
    }
    
}
