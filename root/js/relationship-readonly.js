var MARGIN=30;
var svg_root = null;
var svg_root_element = null;
var start_element_height = 0;
var reltypes = {};
var readingdata = {};

function getRelativePath() {
	return basepath;
}

function getTextURL( which ) {
	return basepath + textid + '/' + which;
}

function getReadingURL( reading_id ) {
	return basepath + textid + '/reading/' + reading_id;
}

// Make an XML ID into a valid selector
function jq(myid) { 
	return '#' + myid.replace(/(:|\.)/g,'\\$1');
}

// Actions for opening the reading panel
function node_dblclick_listener( evt ) {
  	// Open the reading dialogue for the given node.
  	// First get the reading info
  	var reading_id = $(this).attr('id');
  	var reading_info = readingdata[reading_id];
  	// and then populate the dialog box with it.
  	// Set the easy properties first
  	$('#reading-form').dialog( 'option', 'title', 'Reading information for "' + reading_info['text'] + '"' );
  	$('#reading_id').val( reading_id );
  	toggle_checkbox( $('#reading_is_nonsense'), reading_info['is_nonsense'] );
  	toggle_checkbox( $('#reading_grammar_invalid'), reading_info['grammar_invalid'] );
  	// Use .text as a backup for .normal_form
  	var normal_form = reading_info['normal_form'];
  	if( !normal_form ) {
  		normal_form = reading_info['text'];
  	}
  	var nfboxsize = 10;
  	if( normal_form.length > 9 ) {
  		nfboxsize = normal_form.length + 1;
  	}
  	$('#reading_normal_form').attr( 'size', nfboxsize )
  	$('#reading_normal_form').val( normal_form );
  	// Now do the morphological properties.
  	morphology_form( reading_info['lexemes'] );
  	// and then open the dialog.
  	$('#reading-form').dialog("open");
}

function toggle_checkbox( box, value ) {
	if( value == null ) {
		value = false;
	}
	box.attr('checked', value );
}

function morphology_form ( lexlist ) {
  	$('#morphology').empty();
  	$.each( lexlist, function( idx, lex ) {
  		var morphoptions = [];
  		if( 'wordform_matchlist' in lex ) {
			$.each( lex['wordform_matchlist'], function( tdx, tag ) {
				var tagstr = stringify_wordform( tag );
				morphoptions.push( tagstr );
			});
		}
  		var formtag = 'morphology_' + idx;
  		var formstr = '';
  		if( 'form' in lex ) {
  			formstr = stringify_wordform( lex['form'] );
  		} 
  		var form_morph_elements = morph_elements( 
  			formtag, lex['string'], formstr, morphoptions );
		$.each( form_morph_elements, function( idx, el ) {
			$('#morphology').append( el );
		});
  	});
}

function stringify_wordform ( tag ) {
	if( tag ) {
		var elements = tag.split(' // ');
		return elements[1] + ' // ' + elements[2];
	}
	return ''
}

function morph_elements ( formtag, formtxt, currform, morphoptions ) {
	var clicktag = '(Click to select)';
	if ( !currform ) {
		currform = clicktag;
	}
	var formlabel = $('<label/>').attr( 'id', 'label_' + formtag ).attr( 
		'for', 'reading_' + formtag ).text( formtxt + ': ' );
	var forminput = $('<input/>').attr( 'id', 'reading_' + formtag ).attr( 
		'name', 'reading_' + formtag ).attr( 'size', '50' ).attr(
		'class', 'reading_morphology' ).val( currform );
	forminput.autocomplete({ source: morphoptions, minLength: 0	});
	forminput.focus( function() { 
		if( $(this).val() == clicktag ) {
			$(this).val('');
		}
		$(this).autocomplete('search', '') 
	});
	var morphel = [ formlabel, forminput, $('<br/>') ];
	return morphel;
}

function color_inactive ( el ) {
	var reading_id = $(el).parent().attr('id');
	var reading_info = readingdata[reading_id];
	// If the reading info has any non-disambiguated lexemes, color it yellow;
	// otherwise color it green.
	$(el).attr( {stroke:'green', fill:'#b3f36d'} );
	if( reading_info ) {
		$.each( reading_info['lexemes'], function ( idx, lex ) {
			if( !lex['is_disambiguated'] || lex['is_disambiguated'] == 0 ) {
				$(el).attr( {stroke:'orange', fill:'#fee233'} );
			}
		});
	}
}

function relemmatize () {
	// Send the reading for a new lemmatization and reopen the form.
	$('#relemmatize_pending').show();
	var reading_id = $('#reading_id').val()
	ncpath = getReadingURL( reading_id );
	form_values = { 
		'normal_form': $('#reading_normal_form').val(), 
		'relemmatize': 1 };
	var jqjson = $.post( ncpath, form_values, function( data ) {
		// Update the form with the return
		if( 'id' in data ) {
			// We got back a good answer. Stash it
			readingdata[reading_id] = data;
			// and regenerate the morphology form.
			morphology_form( data['lexemes'] );
		} else {
			alert("Could not relemmatize as requested: " + data['error']);
		}
		$('#relemmatize_pending').hide();
	});
}

// Initialize the SVG once it exists
function svgEnlargementLoaded() {
	//Give some visual evidence that we are working
	$('#loading_overlay').show();
	lo_height = $("#enlargement_container").outerHeight();
	lo_width = $("#enlargement_container").outerWidth();
	$("#loading_overlay").height( lo_height );
	$("#loading_overlay").width( lo_width );
	$("#loading_overlay").offset( $("#enlargement_container").offset() );
	$("#loading_message").offset(
		{ 'top': lo_height / 2 - $("#loading_message").height() / 2,
		  'left': lo_width / 2 - $("#loading_message").width() / 2 });
    //Set viewbox widht and height to widht and height of $('#svgenlargement svg').
    //This is essential to make sure zooming and panning works properly.
	var rdgpath = getTextURL( 'readings' );
		$.getJSON( rdgpath, function( data ) {
  		readingdata = data;
	    $('#svgenlargement ellipse').each( function( i, el ) { color_inactive( el ) });
  	});
    $('#svgenlargement ellipse').parent().dblclick( node_dblclick_listener );
    var graph_svg = $('#svgenlargement svg');
    var svg_g = $('#svgenlargement svg g')[0];
    if (!svg_g) return;
    svg_root = graph_svg.svg().svg('get').root();

    // Find the real root and ignore any text nodes
    for (i = 0; i < svg_root.childNodes.length; ++i) {
        if (svg_root.childNodes[i].nodeName != '#text') {
		svg_root_element = svg_root.childNodes[i];
		break;
	   }
    }

    svg_root.viewBox.baseVal.width = graph_svg.attr( 'width' );
    svg_root.viewBox.baseVal.height = graph_svg.attr( 'height' );
    //Now set scale and translate so svg height is about 150px and vertically centered in viewbox.
    //This is just to create a nice starting enlargement.
    var initial_svg_height = 250;
    var scale = initial_svg_height/graph_svg.attr( 'height' );
    var additional_translate = (graph_svg.attr( 'height' ) - initial_svg_height)/(2*scale);
    var transform = svg_g.getAttribute('transform');
    var translate = parseFloat( transform.match( /translate\([^\)]*\)/ )[0].split('(')[1].split(' ')[1].split(')')[0] );
    translate += additional_translate;
    var transform = 'rotate(0) scale(' + scale + ') translate(4 ' + translate + ')';
    svg_g.setAttribute('transform', transform);
    //used to calculate min and max zoom level:
    start_element_height = $('#__START__').children('ellipse')[0].getBBox().height;
    add_relations( function() { $('#loading_overlay').hide(); });
}

function add_relations( callback_fn ) {
	var basepath = getRelativePath();
	var textrelpath = getTextURL( 'relationships' );
    $.getJSON( basepath + 'definitions', function(data) {
		var rel_types = data.types.sort();
		$.each( rel_types, function(index, value) {   
			 $('#keymaplist').append( $('<li>').css( "border-color", relation_manager.relation_colors[index] ).text(value) ); 
		});
        $.getJSON( textrelpath, function(data) {
            $.each(data, function( index, rel_info ) {
                var type_index = $.inArray(rel_info.type, rel_types);
                var source_found = get_ellipse( rel_info.source );
                var target_found = get_ellipse( rel_info.target );
                if( type_index != -1 && source_found.size() && target_found.size() ) {
                    var relation = relation_manager.create( rel_info.source, rel_info.target, type_index );
                    relation.data( 'type', rel_info.type );
                    relation.data( 'scope', rel_info.scope );
                    relation.data( 'note', rel_info.note );
                    var node_obj = get_node_obj(rel_info.source);
                    node_obj.ellipse.data( 'node_obj', null );
                    node_obj = get_node_obj(rel_info.target);
                    node_obj.ellipse.data( 'node_obj', null );
                }
            });
            callback_fn.call();
        });
    });
}

function get_ellipse( node_id ) {
	return $( jq( node_id ) + ' ellipse');
}

function get_node_obj( node_id ) {
    var node_ellipse = get_ellipse( node_id );
    if( node_ellipse.data( 'node_obj' ) == null ) {
        node_ellipse.data( 'node_obj', new node_obj(node_ellipse) );
    };
    return node_ellipse.data( 'node_obj' );
}

function node_obj(ellipse) {
  this.ellipse = ellipse;
  var self = this;
  
  this.x = 0;
  this.y = 0;
  this.dx = 0;
  this.dy = 0;
  this.node_elements = node_elements_for(self.ellipse);

  this.update_elements = function() {
      self.node_elements = node_elements_for(self.ellipse);
  }
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
          this.svg_element.siblings('text').attr('class', 'noselect');
      }
  }
  this.un_grey_out = function(filter) {
      if( this.svg_element.parent(filter).size() != 0 ) {
          this.svg_element.attr('stroke', '#000000');
          this.svg_element.siblings('text').attr('fill', '#000000');
          this.svg_element.siblings('text').attr('class', '');
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
  node_id = ellipse.parent().attr('id');
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
    this.relation_colors = [ "#5CCCCC", "#67E667", "#F9FE72", "#6B90D4", "#FF7673", "#E467B3", "#AA67D5", "#8370D8", "#FFC173" ];

    this.create = function( source_node_id, target_node_id, color_index ) {
        //TODO: Protect from (color_)index out of bound..
        var relation_color = self.relation_colors[ color_index ];
        var relation = draw_relation( source_node_id, target_node_id, relation_color );
        var relation_id = get_relation_id( source_node_id, target_node_id );
        get_node_obj( source_node_id ).update_elements();
        get_node_obj( target_node_id ).update_elements();
        // Set it active by default. May need to restore toggling if having all
        // relationships active is too much of a performance hit.
        var relation_path = relation.children('path');
        // All relations active in order to allow hover information?
        // Else we will have to deactivate them when they go off-screen.
		relation_path.css( {'cursor':'pointer'} );
		relation_path.mouseenter( function(event) { 
			outerTimer = setTimeout( function() { 
				timer = setTimeout( function() { 
					var related_nodes = get_related_nodes( relation_id );
					var source_node_id = related_nodes[0];
					var target_node_id = related_nodes[1];
					$('#delete_source_node_id').val( source_node_id );
					$('#delete_target_node_id').val( target_node_id );
					self.showinfo(relation); 
				}, 500 ) 
			}, 1000 );
		});
		relation_path.mouseleave( function(event) {
			clearTimeout(outerTimer); 
			if( timer != null ) { clearTimeout(timer); } 
		});
        
        return relation;
    }

    this.showinfo = function(relation) {
    	var htmlstr = 'type: ' + relation.data( 'type' ) + '<br/>scope: ' + relation.data( 'scope' );
    	if( relation.data( 'note' ) ) {
    		htmlstr = htmlstr + '<br/>note: ' + relation.data( 'note' );
    	}
        $('#delete-form-text').html( htmlstr );
        var points = relation.children('path').attr('d').slice(1).replace('C',' ').split(' ');
        var xs = parseFloat( points[0].split(',')[0] );
        var xe = parseFloat( points[1].split(',')[0] );
        var ys = parseFloat( points[0].split(',')[1] );
        var ye = parseFloat( points[3].split(',')[1] );
        var p = svg_root.createSVGPoint();
        p.x = xs + ((xe-xs)*1.1);
        p.y = ye - ((ye-ys)/2);
        var ctm = svg_root_element.getScreenCTM();
        var nx = p.matrixTransform(ctm).x;
        var ny = p.matrixTransform(ctm).y;
        var dialog_aria = $ ("div[aria-labelledby='ui-dialog-title-delete-form']");
        $('#delete-form').dialog( 'open' );
        dialog_aria.offset({ left: nx, top: ny });
    }
    /* Do we need this in readonly mode?
    this.remove = function( relation_id ) {
        var relation = $( jq( relation_id ) );
        relation.remove();
    }
    */
}

// Utility function to create/return the ID of a relation link between
// a source and target.
function get_relation_id( source_id, target_id ) {
	var idlist = [ source_id, target_id ];
	idlist.sort();
	return 'relation-' + idlist[0] + '-...-' + idlist[1];
}

function get_related_nodes( relation_id ) {
	var srctotarg = relation_id.substr( 9 );
	return srctotarg.split('-...-');
}

function draw_relation( source_id, target_id, relation_color ) {
    var source_ellipse = get_ellipse( source_id );
    var target_ellipse = get_ellipse( target_id );
    var relation_id = get_relation_id( source_id, target_id );
    var svg = $('#svgenlargement').children('svg').svg().svg('get');
    var path = svg.createPath(); 
    var sx = parseInt( source_ellipse.attr('cx') );
    var rx = parseInt( source_ellipse.attr('rx') );
    var sy = parseInt( source_ellipse.attr('cy') );
    var ex = parseInt( target_ellipse.attr('cx') );
    var ey = parseInt( target_ellipse.attr('cy') );
    var relation = svg.group( $("#svgenlargement svg g"), 
    	{ 'class':'relation', 'id':relation_id } );
    svg.title( relation, source_id + '->' + target_id );
    svg.path( relation, path.move( sx, sy ).curveC( sx + (2*rx), sy, ex + (2*rx), ey, ex, ey ), {fill: 'none', stroke: relation_color, strokeWidth: 4});
    var relation_element = $('#svgenlargement .relation').filter( ':last' );
    relation_element.insertBefore( $('#svgenlargement g g').filter(':first') );
    return relation_element;
}

$(document).ready(function () {
    
  timer = null;
  relation_manager = new relation_factory();
  
  $('#enlargement').mousedown(function (event) {
    $(this)
        .data('down', true)
        .data('x', event.clientX)
        .data('y', event.clientY)
        .data('scrollLeft', this.scrollLeft)
        stateTf = svg_root_element.getCTM().inverse();
        var p = svg_root.createSVGPoint();
        p.x = event.clientX;
        p.y = event.clientY;
        stateOrigin = p.matrixTransform(stateTf);
        event.returnValue = false;
        event.preventDefault();
        return false;
  }).mouseup(function (event) {
        $(this).data('down', false);
  }).mousemove(function (event) {
    if( timer != null ) { clearTimeout(timer); } 
    if ( ($(this).data('down') == true) ) {
        var p = svg_root.createSVGPoint();
        p.x = event.clientX;
        p.y = event.clientY;
        p = p.matrixTransform(stateTf);
        var matrix = stateTf.inverse().translate(p.x - stateOrigin.x, p.y - stateOrigin.y);
        var s = "matrix(" + matrix.a + "," + matrix.b + "," + matrix.c + "," + matrix.d + "," + matrix.e + "," + matrix.f + ")";
        svg_root_element.setAttribute("transform", s);
    }
    event.returnValue = false;
    event.preventDefault();
  }).mousewheel(function (event, delta) {
    event.returnValue = false;
    event.preventDefault();
	if (!delta || delta == null || delta == 0) delta = event.originalEvent.wheelDelta;
	if (!delta || delta == null || delta == 0) delta = -1 * event.originalEvent.detail;
	if( delta < -9 ) { delta = -9 }; 
	var z = 1 + delta/10;
	z = delta > 0 ? 1 : -1;
	var g = svg_root_element;
	if (g && ((z<1 && (g.getScreenCTM().a * start_element_height) > 4.0) || (z>=1 && (g.getScreenCTM().a * start_element_height) < 100))) {
		var root = svg_root;
		var p = root.createSVGPoint();
		p.x = event.originalEvent.clientX;
		p.y = event.originalEvent.clientY;
		p = p.matrixTransform(g.getCTM().inverse());
		var scaleLevel = 1+(z/20);
		var k = root.createSVGMatrix().translate(p.x, p.y).scale(scaleLevel).translate(-p.x, -p.y);
		var matrix = g.getCTM().multiply(k);
		var s = "matrix(" + matrix.a + "," + matrix.b + "," + matrix.c + "," + matrix.d + "," + matrix.e + "," + matrix.f + ")";
		g.setAttribute("transform", s);
	}
  }).css({
    'overflow' : 'hidden',
    'cursor' : '-moz-grab'
  });
  
  $( "#delete-form" ).dialog({
    autoOpen: false,
    height: 135,
    width: 160,
    modal: false,
    buttons: {
        OK: function() {
            $( this ).dialog( "close" );
        }
    },
    create: function(event, ui) {
        var buttonset = $(this).parent().find( '.ui-dialog-buttonset' ).css( 'width', '100%' );
        buttonset.find( "button:contains('Cancel')" ).css( 'float', 'right' );
        var dialog_aria = $("div[aria-labelledby='ui-dialog-title-delete-form']");  
        dialog_aria.mouseenter( function() {
            if( mouseWait != null ) { clearTimeout(mouseWait) };
        })
        dialog_aria.mouseleave( function() {
            mouseWait = setTimeout( function() { $("#delete-form").dialog( "close" ) }, 2000 );
        })
    },
    open: function() {
        mouseWait = setTimeout( function() { $("#delete-form").dialog( "close" ) }, 2000 );
    },
    close: function() {
    }
  });

  // function for reading form dialog should go here; for now hide the element
  $('#reading-form').dialog({
  	autoOpen: false,
  	height: 400,
  	width: 600,
  	modal: true,
  	buttons: {
  		OK: function() {
  			$( this ).dialog( "close" );
  		}
  	},
  	create: function() {
  	},
  	open: function() {
        $(".ui-widget-overlay").css("background", "none");
        $("#dialog_overlay").show();
        $('#reading_status').empty();
        $("#dialog_overlay").height( $("#enlargement_container").height() );
        $("#dialog_overlay").width( $("#enlargement_container").innerWidth() );
        $("#dialog_overlay").offset( $("#enlargement_container").offset() );
        $("#reading-form").parent().find('.ui-button').button("enable");
  	},
	close: function() {
		$("#dialog_overlay").hide();
	}
  }).ajaxError( function(event, jqXHR, ajaxSettings, thrownError) {
      if( ajaxSettings.url.lastIndexOf( getReadingURL('') ) > -1
      	&& ajaxSettings.type == 'POST' && jqXHR.status == 403 ) {
      	  var errobj = jQuery.parseJSON( jqXHR.responseText );
          $('#reading_status').append( '<p class="error">Error: ' + errobj.error + '</p>' );
      }
	  $(event.target).parent().find('.ui-button').button("enable");
  });
  
  // Hide the unused elements
  $('#dialog-form').hide();
  $('#update_workspace_button').hide();
  
  $('.helptag').popupWindow({ 
	  height:500, 
	  width:800, 
	  top:50, 
	  left:50,
	  scrollbars:1 
  }); 

  
  expandFillPageClients();
  $(window).resize(function() {
    expandFillPageClients();
  });

});


function expandFillPageClients() {
	$('.fillPage').each(function () {
		$(this).height($(window).height() - $(this).offset().top - MARGIN);
	});
}

function loadSVG(svgData) {
	var svgElement = $('#svgenlargement');

	$(svgElement).svg('destroy');

	$(svgElement).svg({
		loadURL: svgData,
		onLoad : svgEnlargementLoaded
	});
}


/*	OS Gadget stuff

function svg_select_callback(topic, data, subscriberData) {
	svgData = data;
	loadSVG(svgData);
}

function loaded() {
	var prefs = new gadgets.Prefs();
	var preferredHeight = parseInt(prefs.getString('height'));
	if (gadgets.util.hasFeature('dynamic-height')) gadgets.window.adjustHeight(preferredHeight);
	expandFillPageClients();
}

if (gadgets.util.hasFeature('pubsub-2')) {
	gadgets.HubSettings.onConnect = function(hum, suc, err) {
		subId = gadgets.Hub.subscribe("interedition.svg.selected", svg_select_callback);
		loaded();
	};
}
else gadgets.util.registerOnLoadHandler(loaded);
*/
