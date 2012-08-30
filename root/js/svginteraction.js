function getRelativePath( action ) {
    path_elements = window.location.pathname.split('/'); 
    if( path_elements[1].length > 0 ) {
        return window.location.pathname.split('/')[1] + '/' + action;
    } else {
        return action;
    }
}

function svgLoaded() {
  $('ellipse').attr( {stroke:'black', fill:'#fff'} );
  ncpath = getRelativePath( 'node_click' );
  var jqjson = $.getJSON( ncpath, 'node_id=null', function(data) {
    $.each( data, function(item, node_id_and_state) {
      if( node_id_and_state[1] == 1 ) {
        node_ellipse = $('.node').children('title').filter( function(index) {
          return $(this).text() == node_id_and_state[0];
        }).siblings('ellipse');
        node_ellipse.attr( {stroke:'green', fill:'#b3f36d'} );
        $('#constructedtext').append( node_ellipse.siblings('text').text() + '&#32;' );
      } else {
        if( node_id_and_state[1] == null ) {
          $('#constructedtext').append( ' &hellip; ' );
        }
      }
    });
    add_node_objs();
  });
}

function add_node_objs() {
  $('ellipse[fill="#fff"]').each( function() {
      $(this).data( 'node_obj', new node_obj( $(this) ) );
    }
  );
}

function get_node_obj( node_id ) {
  return $('.node').children('title').filter( function(index) {
    return $(this).text() == node_id;
  }).siblings('ellipse').data( 'node_obj' );
}

function get_edge( edge_id ) {
  return $('.edge').filter( function(index) {
    return $(this).children( 'title' ).text() == $('<div/>').html(edge_id).text() ;
  });
}

function node_obj(ellipse) {
  this.ellipse = ellipse;
  var self = this;
  
  this.x = 0;
  this.y = 0;
  this.dx = 0;
  this.dy = 0;
  this.node_elements = node_elements_for(self.ellipse);
  this.sub_nodes = [];
  this.super_node = null;

  this.dblclick_listener = function(evt) {
    node_id = self.ellipse.siblings('title').text();
    ncpath = getRelativePath( 'node_click' );
    var jqjson = $.getJSON( ncpath, 'node_id=' + node_id, function(data) {
      $('#constructedtext').empty();
      $.each( data, function(item, node_id_and_state) {
        node = get_node_obj( node_id_and_state[0] );
        // 1 -> turn the associated SVG node on, put in the associate word in the text box.
        // 0 -> turn SVG node off.
        // null -> turn node off, put in ellipsis in text box at the corresponding place.
        if( node_id_and_state[1] == 1 ) {
//TODO: create test suite en refactor this in to more OO! (node and node_ellipse are 'conflated')
          node_ellipse = $('.node').children('title').filter( function(index) {
            return $(this).text() == node_id_and_state[0];
          }).siblings('ellipse');
          $('#constructedtext').append( node_ellipse.siblings('text').text() + '&#32;' );
          if( node ) { node.set_draggable( false ) }
        } else {
          if( node ) { node.set_draggable( true ) };
          if( node_id_and_state[1] == null ) {
            $('#constructedtext').append( ' &hellip; ' );
          }
        }
      });
    });
  }

  this.set_draggable = function( draggable ) {
    if( draggable ) {
      self.ellipse.attr( {stroke:'black', fill:'#fff'} );
      self.ellipse.mousedown( this.mousedown_listener );
      self.ellipse.hover( this.enter_node, this.leave_node );  
    } else {
      self.ellipse.unbind('mouseenter').unbind('mouseleave').unbind('mousedown');
      self.ellipse.attr( {stroke:'green', fill:'#b3f36d'} );
    }
  }

  this.mousedown_listener = function(evt) {
    evt.stopPropagation();
    self.x = evt.clientX;
    self.y = evt.clientY;
    $('body').mousemove( self.mousemove_listener );
    $('body').mouseup( self.mouseup_listener );
    self.ellipse.unbind('mouseenter').unbind('mouseleave')
    self.ellipse.attr( 'fill', '#ff66ff' );
  }

  this.mousemove_listener = function(evt) {
    self.dx = evt.clientX - self.x;
    self.dy = evt.clientY - self.y;
    self.move_elements();
  }

  this.mouseup_listener = function(evt) {    
    if( $('ellipse[fill="#ffccff"]').size() > 0 ) {
      $('#source_node_id').val( self.ellipse.siblings('title').text() );
      $('#target_node_id').val( $('ellipse[fill="#ffccff"]').siblings("title").text() );
      $( '#dialog-form' ).dialog( 'open' );
    };
    $('body').unbind('mousemove');
    $('body').unbind('mouseup');
    self.ellipse.attr( 'fill', '#fff' );
    self.ellipse.hover( self.enter_node, self.leave_node );
    if( self.super_node ) {
      self.eclipse();
    } else {
      self.reset_elements();
    }
  }

  this.cpos = function() {
    return { x: self.ellipse.attr('cx'), y: self.ellipse.attr('cy') };
  }

  this.get_g = function() {
    return self.ellipse.parent('g');
  }

  this.stack_behind = function( collapse_info ) {
    self.super_node = get_node_obj( collapse_info.target );
    self.super_node.sub_nodes.push( self );
    self.eclipse();
    if( collapse_info.edges ) {
      $.each( collapse_info.edges, function( source_edge_id, target_info ) {
        get_edge(source_edge_id).attr( 'display', 'none' );
        target_edge = get_edge(target_info.target);
        // Unfortunately, the simple solution doesn't work...
        // target_edge.children( 'text' ).replaceWith( '<text x="2270" y="-59.400001525878906"><tspan text-anchor="middle">A, B</tspan><tspan fill="red">, C</tspan></text>' );
        // ..so we take the long and winding road...
        var svg = $('#svgbasics').children('svg').svg().svg('get');
        textx = target_edge.children( 'text' )[0].x.baseVal.getItem(0).value
        texty = target_edge.children( 'text' )[0].y.baseVal.getItem(0).value
        current_label = target_edge.children( 'text' ).text(); 
        target_edge.children( 'text' ).remove();
        texts = svg.createText();
        texts.span(current_label, {'text-anchor': 'middle'}).span(target_info.label, {fill: 'red'});
        svg.text(target_edge, textx, texty, texts);
      }); 
    }
  }

  this.eclipse = function() {
    self.dx = new Number( self.super_node.cpos().x ) - new Number( self.cpos().x ) + ( 10 * (self.super_node.sub_nodes.indexOf(self) + 1) );
    self.dy = new Number( self.super_node.cpos().y ) - new Number( self.cpos().y ) + ( 5 * (self.super_node.sub_nodes.indexOf(self) + 1) );
    self.move_elements();
    eclipse_index = self.super_node.sub_nodes.indexOf(self) - 1;
    if( eclipse_index > -1 ) {
      self.get_g().insertBefore( self.super_node.sub_nodes[eclipse_index].get_g() );
    } else {
      self.get_g().insertBefore( self.super_node.get_g() );
    }
  }

  this.enter_node = function(evt) {
    self.ellipse.attr( 'fill', '#ffccff' );
  }

  this.leave_node = function(evt) {
    self.ellipse.attr( 'fill', '#fff' );
  }

  this.move_elements = function() {
    $.each( self.node_elements, function(index, value) {
      value.move(self.dx,self.dy);
    });
  }

  this.reset_elements = function() {
    $.each( self.node_elements, function(index, value) {
      value.reset();
    });
  }

  this.ellipse.dblclick( this.dblclick_listener );
  self.set_draggable( true );
}

function svgshape( shape_element ) {
  this.shape = shape_element;
  this.move = function(dx,dy) {
    this.shape.attr( "transform", "translate(" + dx + " " + dy + ")" );
  }
  this.reset = function() {
    this.shape.attr( "transform", "translate( 0, 0 )" );
  }
}

function svgpath( path_element ) {
  this.path = path_element;
  this.x = this.path.x;
  this.y = this.path.y;
  this.move = function(dx,dy) {
    this.path.x = this.x + dx;
    this.path.y = this.y + dy;
  }
  this.reset = function() {
    this.path.x = this.x;
    this.path.y = this.y;
  }
}

function node_elements_for( ellipse ) {
  node_elements = get_edge_elements_for( ellipse );
  node_elements.push( new svgshape( ellipse.siblings('text') ) );
  node_elements.push( new svgshape( ellipse ) );
  return node_elements;
}

function get_edge_elements_for( ellipse ) {
  edge_elements = new Array();
  node_id = ellipse.siblings('title').text();
  edge_in_pattern = new RegExp( node_id + '$' );
  edge_out_pattern = new RegExp( '^' + node_id );
  $.each( $('.edge').children('title'), function(index) {
    title = $(this).text();
    if( edge_in_pattern.test(title) ) {
      edge_elements.push( new svgshape( $(this).siblings('polygon') ) );
      path_segments = $(this).siblings('path')[0].pathSegList;
      edge_elements.push( new svgpath( path_segments.getItem(path_segments.numberOfItems - 1) ) );
    }
    if( edge_out_pattern.test(title) ) {
      path_segments = $(this).siblings('path')[0].pathSegList;
      edge_elements.push( new svgpath( path_segments.getItem(0) ) );
    }
  });
  return edge_elements;
} 

$(document).ready(function () {
  $('#graph').ajaxError(function() {
    console.log( 'Oops.. something went wrong with trying to save this change. Please try again...' );
  });
  $('#graph').mousedown(function (event) {
    $(this)
      .data('down', true)
      .data('x', event.clientX)
      .data('scrollLeft', this.scrollLeft);
      return false;
  }).mouseup(function (event) {
    $(this).data('down', false);
  }).mousemove(function (event) {
    if ($(this).data('down') == true ) {
      this.scrollLeft = $(this).data('scrollLeft') + $(this).data('x') - event.clientX;
    }
  }).mousewheel(function (event, delta) {
      this.scrollLeft -= (delta * 30);
  }).css({
    'overflow' : 'hidden',
    'cursor' : '-moz-grab'
  });
  $( "#dialog-form" ).dialog({
    autoOpen: false,
    height: 150,
    width: 250,
    modal: true,
    buttons: {
      "Ok": function() {
        form_values = $('#collapse_node_form').serialize()
	ncpath = getRelativePath( 'node_collapse' );
        var jqjson = $.getJSON( ncpath, form_values, function(data) {
          $.each( data, function(item, collapse_info) { 
            get_node_obj( item ).stack_behind( collapse_info );
          });
        });
        $( this ).dialog( "close" );
      },
      Cancel: function() {
        $( this ).dialog( "close" );
      }
    },
    close: function() {
      $('#reason').val( "" ).removeClass( "ui-state-error" );
    }
  });
});


$(window).mouseout(function (event) {
  if ($('#graph').data('down')) {
    try {
      if (event.originalTarget.nodeName == 'BODY' || event.originalTarget.nodeName == 'HTML') {
        $('#graph').data('down', false);
      }                
    } catch (e) {}
  }
});


