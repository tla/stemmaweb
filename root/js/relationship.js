function getTextPath() {
    var currpath = window.location.pathname
    if( currpath.lastIndexOf('/') == currpath.length - 1 ) { 
    	currpath = currpath.slice( 0, currpath.length - 1) 
    };
    var path_elements = currpath.split('/');
    var textid = path_elements.pop();
    var basepath = path_elements.join( '/' );
    var path_parts = [ basepath, textid ];
    return path_parts;
}

function svgLoaded() {
  // some initial scaling
  var svg_element = $('#svgbasics').children('svg');
  var svg_graph = svg_element.svg().svg('get').root();
  var svg_vbwidth = svg_graph.viewBox.baseVal.width;
  var svg_vbheight = svg_graph.viewBox.baseVal.height;
  var scroll_padding = $('#graph_container').width();
  // (Use attr('width') to set width attr, otherwise style="width: npx;" is set.)
  var svg_element_width = svg_vbwidth/svg_vbheight * parseInt(svg_element.attr('height'));
  svg_element_width += scroll_padding;
  svg_element.attr( 'width', svg_element_width );
  $('ellipse').attr( {stroke:'black', fill:'#fff'} );
}

function svgEnlargementLoaded() {
  // some initial scaling
  var svg_element = $('#svgenlargement').children('svg');
  var svg_graph = svg_element.svg().svg('get').root()
  var svg_vbwidth = svg_graph.viewBox.baseVal.width;
  var svg_vbheight = svg_graph.viewBox.baseVal.height;
  var scroll_padding = $('#enlargement_container').width();
  // (Use attr('width') to set width attr, otherwise style="width: npx;" is set.)
  var svg_element_width = svg_vbwidth/svg_vbheight * parseInt(svg_element.attr('height'));
  svg_element_width += scroll_padding;
  svg_element.attr( 'width', svg_element_width );
    $('ellipse').attr({
        stroke: 'black',
        fill: '#fff'
    });
  var svg_height = parseInt( $('#svgenlargement').height() );
  scroll_enlargement_ratio = svg_height/svg_vbheight;
    add_relations();
}

function add_relations() {
	var pathparts = getTextPath();
    $.getJSON( pathparts[0] + '/definitions', function(data) {
        var rel_types = data.types.sort();
        var pathparts = getTextPath();
        $.getJSON( pathparts[0] + '/' + pathparts[1] + '/relationships',
        function(data) {
            $.each(data, function( index, rel_info ) {
                var type_index = $.inArray(rel_info.type, rel_types);
                if( type_index != -1 ) {
                    relation_manager.create( rel_info.source, rel_info.target, type_index );
                }
            })
        });    
    });
}

function get_ellipse( node_id ) {
  return $('#svgenlargement .node').children('title').filter( function(index) {
    return $(this).text() == node_id;
  }).siblings('ellipse');
}

function get_node_obj( node_id ) {
  return get_ellipse( node_id ).data( 'node_obj' );
}

function get_edge( edge_id ) {
  return $('#svgenlargement .edge').filter( function(index) {
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

  this.get_id = function() {
    return self.ellipse.siblings('title').text()
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
    first_node_g_element = $("#svgenlargement g .node" ).filter( ":first" );
    if( first_node_g_element.attr('id') !== self.get_g().attr('id') ) { self.get_g().insertBefore( first_node_g_element ) };
  }

  this.mousemove_listener = function(evt) {
    // magnification on workspace lock temporarily disabled
    // self.dx = (evt.clientX - self.x) / mousemove_enlargement_ratio;
    // self.dy = (evt.clientY - self.y) / mousemove_enlargement_ratio;
    self.dx = (evt.clientX - self.x) / scroll_enlargement_ratio;
    self.dy = (evt.clientY - self.y) / scroll_enlargement_ratio;
    self.move_elements();
  }

  this.mouseup_listener = function(evt) {    
    if( $('ellipse[fill="#ffccff"]').size() > 0 ) {
        var source_node_id = self.ellipse.siblings('title').text();
        var target_node_id = $('ellipse[fill="#ffccff"]').siblings("title").text();
        $('#source_node_id').val( source_node_id );
        $('#target_node_id').val( target_node_id );
        $('#dialog-form').dialog( 'open' );
    };
    $('body').unbind('mousemove');
    $('body').unbind('mouseup');
    self.ellipse.attr( 'fill', '#fff' );
    self.ellipse.hover( self.enter_node, self.leave_node );
        self.reset_elements();
  }

  this.cpos = function() {
    return { x: self.ellipse.attr('cx'), y: self.ellipse.attr('cy') };
  }

  this.get_g = function() {
    return self.ellipse.parent('g');
  }

  this.enter_node = function(evt) {
    self.ellipse.attr( 'fill', '#ffccff' );
  }

  this.leave_node = function(evt) {
    self.ellipse.attr( 'fill', '#fff' );
  }

  this.greyout_edges = function() {
      $.each( self.node_elements, function(index, value) {
        value.grey_out('.edge');
      });
  }

  this.ungreyout_edges = function() {
      $.each( self.node_elements, function(index, value) {
        value.un_grey_out('.edge');
      });
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

  this.update_elements = function() {
      self.node_elements = node_elements_for(self.ellipse);
  }

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
  this.grey_out = function(filter) {
      if( this.shape.parent(filter).size() != 0 ) {
          this.shape.attr({'stroke':'#e5e5e5', 'fill':'#e5e5e5'});
      }
  }
  this.un_grey_out = function(filter) {
      if( this.shape.parent(filter).size() != 0 ) {
        this.shape.attr({'stroke':'#000000', 'fill':'#000000'});
      }
  }
}

function svgpath( path_element, svg_element ) {
  this.svg_element = svg_element;
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
  this.grey_out = function(filter) {
      if( this.svg_element.parent(filter).size() != 0 ) {
          this.svg_element.attr('stroke', '#e5e5e5');
          this.svg_element.siblings('text').attr('fill', '#e5e5e5');
      }
  }
  this.un_grey_out = function(filter) {
      if( this.svg_element.parent(filter).size() != 0 ) {
          this.svg_element.attr('stroke', '#000000');
          this.svg_element.siblings('text').attr('fill', '#000000');
      }
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
  $.each( $('#svgenlargement .edge,#svgenlargement .relation').children('title'), function(index) {
    title = $(this).text();
    if( edge_in_pattern.test(title) ) {
        polygon = $(this).siblings('polygon');
        if( polygon.size() > 0 ) {
            edge_elements.push( new svgshape( polygon ) );
        }
        path_segments = $(this).siblings('path')[0].pathSegList;
        edge_elements.push( new svgpath( path_segments.getItem(path_segments.numberOfItems - 1), $(this).siblings('path') ) );
    }
    if( edge_out_pattern.test(title) ) {
      path_segments = $(this).siblings('path')[0].pathSegList;
      edge_elements.push( new svgpath( path_segments.getItem(0), $(this).siblings('path') ) );
    }
  });
  return edge_elements;
} 

function relation_factory() {
    var self = this;
    this.color_memo = null;
    //TODO: colors hard coded for now
    this.temp_color = '#FFA14F';
    this.relation_colors = [ "#5CCCCC", "#67E667", "#F9FE72", "#6B90D4", "#FF7673", "#E467B3", "#AA67D5", "#8370D8", "#FFC173" ];

    this.create_temporary = function( source_node_id, target_node_id ) {
    var relation = $('#svgenlargement .relation').filter( function(index) {
        var relation_id = $(this).children('title').text();
            if( ( relation_id == ( source_node_id + '->' + target_node_id ) ) || ( relation_id == ( target_node_id + '->' + source_node_id ) ) ) {
            return true;
        } 
    } );
    if( relation.size() == 0 ) {
            draw_relation( source_node_id, target_node_id, self.temp_color );
        } else {
            self.color_memo = relation.children('path').attr( 'stroke' );
            relation.children('path').attr( 'stroke', self.temp_color );
        }
    }
    this.remove_temporary = function() {
        var path_element = $('#svgenlargement .relation').children('path[stroke="' + self.temp_color + '"]');
        if( self.color_memo != null ) {
            path_element.attr( 'stroke', self.color_memo );
            self.color_memo = null;
        } else {
            path_element.parent('g').remove();
        }
    }
    this.create = function( source_node_id, target_node_id, color_index ) {
        //TODO: Protect from (color_)index out of bound..
        var relation_color = self.relation_colors[ color_index ];
        draw_relation( source_node_id, target_node_id, relation_color );
        var source_node = get_node_obj( source_node_id );
        var target_node = get_node_obj( target_node_id );
        if( source_node != null ) { source_node.update_elements() };
        if( target_node != null ) { target_node.update_elements() };
    }
    this.remove = function( source_node_id, target_id ) {
        //TODO (When needed)
        console.log( "Unsupported function node_obj.remove()." );
    }
}

function draw_relation( source_id, target_id, relation_color ) {
        var source_ellipse = get_ellipse( source_id );
        var target_ellipse = get_ellipse( target_id );
        var svg = $('#svgenlargement').children('svg').svg().svg('get');
        var path = svg.createPath(); 
        var sx = parseInt( source_ellipse.attr('cx') );
        var rx = parseInt( source_ellipse.attr('rx') );
        var sy = parseInt( source_ellipse.attr('cy') );
        var ex = parseInt( target_ellipse.attr('cx') );
        var ey = parseInt( target_ellipse.attr('cy') );
        var relation = svg.group( $("#svgenlargement svg g"), {'class':'relation'} );
        svg.title( relation, source_id + '->' + target_id );
        svg.path( relation, path.move( sx, sy ).curveC( sx + (2*rx), sy, ex + (2*rx), ey, ex, ey ), {fill: 'none', stroke: relation_color, strokeWidth: 4});
    var relation_element = $('#svgenlargement .relation').filter( ':last' );
    relation_element.insertBefore( $('#svgenlargement g g').filter(':first') );
}

$(document).ready(function () {
  
  relation_manager = new relation_factory();
  
  scroll_ratio =  $('#enlargement').height() / $('#graph').height();
  
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
      if ( $('#update_workspace_button').data('locked') != true ) {
          var scroll_left = $(this).data('scrollLeft') + $(this).data('x') - event.clientX;
          this.scrollLeft = scroll_left;
          var enlarged_scroll_left = scroll_left * scroll_ratio; 
          $('#enlargement').scrollLeft( enlarged_scroll_left );
          color_enlarged();
      }
    }
  }).mousewheel(function (event, delta) {
      if ( $('#update_workspace_button').data('locked') != true ) {
          var scroll_left = delta * 30;
          this.scrollLeft -= scroll_left;
          var enlarged_scroll_left = $('#enlargement').scrollLeft();
          enlarged_scroll_left -= (scroll_left * scroll_ratio);
          $('#enlargement').scrollLeft( enlarged_scroll_left );
          color_enlarged();
      }
  }).css({
    'overflow' : 'hidden',
    'cursor' : '-moz-grab'
  });
  

  $( "#dialog-form" ).dialog({
    autoOpen: false,
    height: 270,
    width: 290,
    modal: true,
    buttons: {
      "Ok": function() {
        $('#status').empty();
        form_values = $('#collapse_node_form').serialize()
        pathparts = getTextPath();
        ncpath = pathparts[0] + '/' + pathparts[1] + '/relationship';
        var jqjson = $.post( ncpath, form_values, function(data) {
            $.each( data, function(item, source_target) { 
                relation_manager.create( source_target[0], source_target[1], $('#rel_type').attr('selectedIndex') );
            });
            relation_manager.remove_temporary();
            $( "#dialog-form" ).dialog( "close" );
        }, 'json');
      },
      Cancel: function() {
          relation_manager.remove_temporary();
          $( this ).dialog( "close" );
      }
    },
    create: function(event, ui) { 
        $(this).data( 'relation_drawn', false );
        //TODO? Err handling?
        var pathparts = getTextPath();
        var jqjson = $.getJSON( pathparts[0] + '/definitions', function(data) {
            var types = data.types.sort();
            $.each( types, function(index, value) {   
                 $('#rel_type').append( $('<option>').attr( "value", value ).text(value) ); 
                 $('#keymaplist').append( $('<li>').css( "border-color", relation_manager.relation_colors[index] ).text(value) ); 
            });
            var scopes = data.scopes;
            $.each( scopes, function(index, value) {   
                 $('#scope').append( $('<option>').attr( "value", value ).text(value) ); 
            });
        });        
    },
    open: function() {
        relation_manager.create_temporary( $('#source_node_id').val(), $('#target_node_id').val() );
      $(".ui-widget-overlay").css("background", "none");
      $("#dialog_overlay").show();
      $("#dialog_overlay").height( $("#enlargement_container").height() );
      $("#dialog_overlay").width( $("#enlargement_container").width() );
      $("#dialog_overlay").offset( $("#enlargement_container").offset() );
    },
    close: function() {
        $( '#status' ).empty();
        $("#dialog_overlay").hide();
    }
  }).ajaxError( function(event, jqXHR, ajaxSettings, thrownError) {
      if( ( ajaxSettings.url.split("?")[0] == 'set_relationship' ) && jqXHR.status == 403 ) {
          $('#status').append( '<p class="error">The relationship can not be made in this way between these nodes.</p>' );
      }
  } );

  $('#update_workspace_button').click( function() {
     var svg_enlargement = $('#svgenlargement').svg().svg('get').root();
     if( $(this).data('locked')==true) {
         $.each( ellipses_in_magnifier, function( index, ellipse ) {
             ellipse.data( 'node_obj' ).ungreyout_edges();
             ellipse.data( 'node_obj' ).set_draggable( false );
             ellipse.data( 'node_obj', null );
         })
         // magnification on workspace lock temporarily disabled
         // svg_enlargement.children[0].setAttribute( 'transform', $(this).data('transform_memo') );
         // $('#enlargement').scrollLeft( $(this).data('scrollleft_memo') );
         $(this).data('locked', false);
         $(this).css('background-position', '0px 0px');
     } else {
         $(this).css('background-position', '0px 17px');
         var y_min = parseInt( ellipses_in_magnifier[0].attr('cy') ) - parseInt( ellipses_in_magnifier[0].attr('ry') ); 
         var y_max = parseInt( ellipses_in_magnifier[0].attr('cy') ) + parseInt( ellipses_in_magnifier[0].attr('ry') ); 
         $.each( ellipses_in_magnifier, function( index, ellipse ) {
             var ny_min = parseInt( ellipse.attr('cy') ) - parseInt( ellipse.attr('ry') ); 
             var ny_max = parseInt( ellipse.attr('cy') ) + parseInt( ellipse.attr('ry') ); 
             if( ny_min < y_min ) { y_min = ny_min }; 
             if( ny_max > y_max ) { y_max = ny_max };
             if( ellipse.data( 'node_obj' ) == null ) {
                 ellipse.data( 'node_obj', new node_obj( ellipse ) );
             } else {
                 ellipse.data( 'node_obj' ).set_draggable( true );
             }
             ellipse.data( 'node_obj' ).greyout_edges();
         })
         // magnification on workspace lock temporarily disabled
         // var graph_frag_height = y_max - y_min ;
         // var svg_enlargement_vbheight = svg_enlargement.viewBox.baseVal.height;
         // var svg_enlargement_vbwidth = svg_enlargement.viewBox.baseVal.width;
         // var scale = svg_enlargement_vbheight / graph_frag_height;
         // mousemove_enlargement_ratio = scroll_enlargement_ratio * scale;
         // var scroll_padding = $('#enlargement_container').width();
         // var scroll_scale =  svg_enlargement_vbwidth / ( parseFloat( $('#svgenlargement svg').attr('width') ) - scroll_padding );
         // var vbx_of_scroll = ( $('#enlargement').scrollLeft() ) * scroll_scale;
         // var translate_x = vbx_of_scroll;
         // var transform = svg_enlargement.children[0].getAttribute('transform');
         // $(this).data('transform_memo', transform );
         // $(this).data('scrollleft_memo', $('#enlargement').scrollLeft() ); 
         $(this).data('locked', true );
         // $('#enlargement').scrollLeft(0);
         // transform = 'scale(' + scale + ') translate(' + (-1 * translate_x) + ',' + (-1 * y_min) + ')';
         // svg_enlargement.children[0].setAttribute( 'transform', transform );
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

function color_enlarged() {
    ellipses_in_magnifier = [];
    var scroll_offset = parseInt( $('#enlargement').scrollLeft() );
    var scroll_padding = $('#enlargement_container').width()/2;
    $('#svgenlargement ellipse,#svgbasics ellipse' ).each( function( index ) {
        var cpos_inscrollcoor = parseInt( $(this).attr('cx') ) * scroll_enlargement_ratio;
        if ( ( cpos_inscrollcoor > (scroll_offset - scroll_padding) ) && ( cpos_inscrollcoor < ( scroll_offset + scroll_padding ) ) ) {
           $(this).attr( {stroke:'green', fill:'#b3f36d'} );
           if( $(this).parents('#svgenlargement').size() == 1 ) { ellipses_in_magnifier.push( $(this) ) };
        } else {
           $(this).attr( {stroke:'black', fill:'#fff'} );
        }
    });   
}




