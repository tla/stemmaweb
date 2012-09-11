// Global state variables
var selectedTextID;
var selectedTextInfo;
var selectedStemmaID = -1;
var stemmata = [];

// Load the names of the appropriate traditions into the directory div.
function refreshDirectory () {
	var lmesg = $('#loading_message').clone();
	$('#directory').empty().append( lmesg.contents() );
    $('#directory').load( _get_url(["directory"]), 
    	function(response, status, xhr) {
			if (status == "error") {
				var msg = "An error occurred: ";
				$("#directory").html(msg + xhr.status + " " + xhr.statusText);
			} else {
				if( textOnLoad != "" ) {
					// Call the click callback for the relevant text, if it is
					// in the page.
					$('#'+textOnLoad).click();
					textOnLoad = "";
				}
			}
		}
	);
}

// Load a tradition with its information and stemmata into the tradition
// view pane. Calls load_textinfo.
function loadTradition( textid, textname, editable ) {
	selectedTextID = textid;
    // First insert the placeholder image and register an error handler
    $('#textinfo_load_status').empty();
    $('#stemma_graph').empty();
    $('#textinfo_waitbox').show();
    $('#textinfo_container').hide().ajaxError( 
    	function(event, jqXHR, ajaxSettings, thrownError) {
    	if( ajaxSettings.url.indexOf( 'textinfo' ) > -1 && ajaxSettings.type == 'GET'  ) {
			$('#textinfo_waitbox').hide();
			$('#textinfo_container').show();
			display_error( jqXHR, $("#textinfo_load_status") );
    	}
    });
    
    // Hide the functionality that is irrelevant
    if( editable ) {
    	$('#open_stemma_add').show();
    	$('#open_stemma_edit').show();
    	$('#open_textinfo_edit').show();
    } else {
    	$('#open_stemma_add').hide();
    	$('#open_stemma_edit').hide();
    	$('#open_textinfo_edit').hide();
    }

    // Then get and load the actual content.
    // TODO: scale #stemma_graph both horizontally and vertically
    // TODO: load svgs from SVG.Jquery (to make scaling react in Safari)
    $.getJSON( _get_url([ "textinfo", textid ]), function (textdata) {
    	// Add the scalar data
    	selectedTextInfo = textdata;
    	load_textinfo();
     	// Add the stemma(ta) and set up the stexaminer button
    	stemmata = textdata.stemmata;
    	if( stemmata.length ) {
    		selectedStemmaID = 0;
			$('#run_stexaminer').show();
    	} else {
    		selectedStemmaID = -1;
			$('#open_stemma_edit').hide();
			$('#run_stexaminer').hide();
		}
		load_stemma( selectedStemmaID );
    	// Set up the relationship mapper button
		$('#run_relater').attr( 'action', _get_url([ "relation", textid ]) );
	});
}

// Load the metadata about a tradition into the appropriate div.
function load_textinfo() {
	$('#textinfo_waitbox').hide();
	$('#textinfo_load_status').empty();
	$('#textinfo_container').show();
	$('.texttitle').empty().append( selectedTextInfo.name );
	// Witnesses
	$('#witness_num').empty().append( selectedTextInfo.witnesses.size );
	$('#witness_list').empty().append( selectedTextInfo.witnesses.join( ', ' ) );
	// Who the owner is
	$('#owner_id').empty().append('no one');
	if( selectedTextInfo.owner ) {
		$('#owner_id').empty().append( selectedTextInfo.owner );
	}
	// Whether or not it is public
	$('#not_public').empty();
	if( selectedTextInfo['public'] == false ) {
		$('#not_public').append('NOT ');
	}
	// What language setting it has, if any
	$('#marked_language').empty().append('no language set');
	if( selectedTextInfo.language && selectedTextInfo.language != 'Default' ) {
		$('#marked_language').empty().append( selectedTextInfo.language );
	}
}	

// Enable / disable the appropriate buttons for paging through the stemma.
function show_stemmapager () {
      $('.pager_left_button').unbind('click').addClass( 'greyed_out' );
      $('.pager_right_button').unbind('click').addClass( 'greyed_out' );
      if( selectedStemmaID > 0 ) {
              $('.pager_left_button').click( function () {
                      load_stemma( selectedStemmaID - 1 );
              }).removeClass( 'greyed_out' );
      }       
      if( selectedStemmaID + 1 < stemmata.length ) {
              $('.pager_right_button').click( function () {
                      load_stemma( selectedStemmaID + 1 );
              }).removeClass( 'greyed_out' );
      }
}

// Load a given stemma SVG into the stemmagraph box.
function load_stemma( idx ) {
	// Load the stemma at idx
	selectedStemmaID = idx;
	show_stemmapager();
	if( idx > -1 ) {
		$('#stemma_graph').empty();
		$('#stemma_graph').append( stemmata[idx] );
		// Stexaminer submit action
		var stexpath = _get_url([ "stexaminer", selectedTextID, idx ]);
		$('#run_stexaminer').attr( 'action', stexpath );
        setTimeout( 'start_element_height = $("#stemma_graph .node")[0].getBBox().height;', 500 );
	}
}

// General-purpose error-handling function.
// TODO make sure this gets used throughout, where appropriate.
function display_error( jqXHR, el ) {
	var errmsg;
	if( jqXHR.responseText == "" ) {
		errmsg = "perhaps the server went down?"
	} else {
		var errobj;
		try {
			errobj = jQuery.parseJSON( jqXHR.responseText );
			errmsg = errobj.error;
		} catch ( parse_err ) {
			errmsg = "something went wrong on the server."
		}
	}
	var msghtml = $('<span>').attr('class', 'error').text( "An error occurred: " + errmsg );
	$(el).empty().append( msghtml ).show();
}

function start_upload_dialog() {
    if( typeof uploader != 'undefined' ){ uploader.destroy() };
    $('#upload-collation-dialog').dialog('option', 'attach_uploader')();
    $('#upload_status').empty();
    $('#upload_button').button('disable');
    $('#upload-collation-dialog').dialog('open');
}

// Utility function to neatly construct an application URL
function _get_url( els ) {
	return basepath + els.join('/');
}

$(document).ready( function() {
    // call out to load the directory div
    $('#textinfo_container').hide();
    $('#textinfo_waitbox').hide();
	refreshDirectory();
	
	// Set up the textinfo edit dialog
	$('#textinfo-edit-dialog').dialog({
		autoOpen: false,
		height: 200,
		width: 300,
		modal: true,
		buttons: {
			Save: function (evt) {
				$("#edit_textinfo_status").empty();
				$(evt.target).button("disable");
				var requrl = _get_url([ "textinfo", selectedTextID ]);
				var reqparam = $('#edit_textinfo').serialize();
				$.post( requrl, reqparam, function (data) {
					// Reload the selected text fields
					selectedTextInfo = data;
					load_textinfo();
					// Reenable the button and close the form
					$(evt.target).button("enable");
					$('#textinfo-edit-dialog').dialog('close');
				}, 'json' );
			},
			Cancel: function() {
				$('#textinfo-edit-dialog').dialog('close');
			}
		},
		open: function() {
			$("#edit_textinfo_status").empty();
			// Populate the form fields with the current values
			// edit_(name, language, public, owner)
			$.each([ 'name', 'language', 'owner' ], function( idx, k ) {
				var fname = '#edit_' + k;
				// Special case: language Default is basically language null
				if( k == 'language' && selectedTextInfo[k] == 'Default' ) {
					$(fname).val( "" );
				} else {
					$(fname).val( selectedTextInfo[k] );
				}
			});
			if( selectedTextInfo['public'] == true ) {
				$('#edit_public').attr('checked','true');
			} else {
				$('#edit_public').removeAttr('checked');
			}
		},
	}).ajaxError( function(event, jqXHR, ajaxSettings, thrownError) {
		$(event.target).parent().find('.ui-button').button("enable");
    	if( ajaxSettings.url.indexOf( 'textinfo' ) > -1 
    		&& ajaxSettings.type == 'POST' ) {
			display_error( jqXHR, $("#edit_textinfo_status") );
    	}
	});

	
	// Set up the stemma editor dialog
	$('#stemma-edit-dialog').dialog({
		autoOpen: false,
		height: 700,
		width: 600,
		modal: true,
		buttons: {
			Save: function (evt) {
				$("#edit_stemma_status").empty();
				$(evt.target).button("disable");
				var stemmaseq = $('#stemmaseq').val();
				var requrl = _get_url([ "stemma", selectedTextID, stemmaseq ]);
				var reqparam = { 'dot': $('#dot_field').val() };
				// TODO We need to stash the literal SVG string in stemmata
				// somehow. Implement accept header on server side to decide
				// whether to send application/json or application/xml?
				$.post( requrl, reqparam, function (data) {
					// We received a stemma SVG string in return. 
					// Update the current stemma sequence number
					selectedStemmaID = data.stemmaid;
					// Stash the answer in our SVG array
					stemmata[selectedStemmaID] = data.stemmasvg;
					// Display the new stemma
					load_stemma( selectedStemmaID );
					// Reenable the button and close the form
					$(evt.target).button("enable");
					$('#stemma-edit-dialog').dialog('close');
				}, 'json' );
			},
			Cancel: function() {
				$('#stemma-edit-dialog').dialog('close');
			}
		},
		open: function(evt) {
			$("#edit_stemma_status").empty();
			var stemmaseq = $('#stemmaseq').val();
			if( stemmaseq == 'n' ) {
				// If we are creating a new stemma, populate the textarea with a
				// bare digraph.
				$(evt.target).dialog('option', 'title', 'Add a new stemma')
				$('#dot_field').val( "digraph stemma {\n\n}" );
			} else {
				// If we are editing a stemma, grab its stemmadot and populate the
				// textarea with that.
				$(evt.target).dialog('option', 'title', 'Edit selected stemma')
				$('#dot_field').val( 'Loading, please wait...' );
				var doturl = _get_url([ "stemmadot", selectedTextID, stemmaseq ]);
				$.getJSON( doturl, function (data) {
					// Re-insert the line breaks
					var dotstring = data.dot.replace(/\|n/gm, "\n");					
					$('#dot_field').val( dotstring );
				});
			}
		},
	}).ajaxError( function(event, jqXHR, ajaxSettings, thrownError) {
		$(event.target).parent().find('.ui-button').button("enable");
    	if( ajaxSettings.url.indexOf( 'stemma' ) > -1 
    		&& ajaxSettings.type == 'POST' ) {
			display_error( jqXHR, $("#edit_stemma_status") );
    	}
	});
		
	$('#upload-collation-dialog').dialog({
		autoOpen: false,
		height: 325,
		width: 480,
		modal: true,
		buttons: {
		  pick: {
		    text: "Pick File",
		    id: "pick_uploadfile_button",
		    click: function() {}       
		  },
		  upload: {
		    text: 'Upload',
		    id: 'upload_button',
		    click: function() {
			    $('#upload_status').empty();
                uploader.start();
                return false;
            }
		  },
		  Cancel: function() {
		    $('#upload-collation-dialog').dialog('close');
		  }
		},
		attach_uploader: function() {
		    create_uploader( _get_url([ "newtradition" ]) );
		    $('#filelist').empty().html( 'Use the \'Pick\' button to choose a source file…' );
		}
	});
	
	$('#stemma_graph').mousedown( function(evt) {
        evt.stopPropagation();
        $('#stemma_graph').data( 'mousedown_xy', [evt.clientX, evt.clientY] );
        $('body').mousemove( function(evt) {
            mouse_scale = 1; // for now, was:  mouse_scale = svg_root_element.getScreenCTM().a;
            dx = (evt.clientX - $('#stemma_graph').data( 'mousedown_xy' )[0]) / mouse_scale;
            dy = (evt.clientY - $('#stemma_graph').data( 'mousedown_xy' )[1]) / mouse_scale;
            $('#stemma_graph').data( 'mousedown_xy', [evt.clientX, evt.clientY] );
            var svg_root = $('#stemma_graph svg').svg().svg('get').root();
            var g = $('g.graph', svg_root).get(0);
            current_translate = g.getAttribute( 'transform' ).split(/translate\(/)[1].split(')',1)[0].split(' ');
            new_transform = g.getAttribute( 'transform' ).replace( /translate\([^\)]*\)/, 'translate(' + (parseFloat(current_translate[0]) + dx) + ' ' + (parseFloat(current_translate[1]) + dy) + ')' );
            g.setAttribute( 'transform', new_transform );
            evt.returnValue = false;
            evt.preventDefault();
            return false;
        });
        $('body').mouseup( function(evt) {
            $('body').unbind('mousemove');
            $('body').unbind('mouseup');
        });
	});
	 
	$('#stemma_graph').mousewheel(function (event, delta) {
        event.returnValue = false;
        event.preventDefault();
        if (!delta || delta == null || delta == 0) delta = event.originalEvent.wheelDelta;
        if (!delta || delta == null || delta == 0) delta = -1 * event.originalEvent.detail;
        if( delta < -9 ) { delta = -9 }; 
        var z = 1 + delta/10;
        z = delta > 0 ? 1 : -1;
        var svg_root = $('#stemma_graph svg').svg().svg('get').root();
        var g = $('g.graph', svg_root).get(0);
        if (g && ((z<1 && (g.getScreenCTM().a * start_element_height) > 4.0) || (z>=1 && (g.getScreenCTM().a * start_element_height) < 1000))) {
            var scaleLevel = z/10;
            current_scale = parseFloat( g.getAttribute( 'transform' ).split(/scale\(/)[1].split(')',1)[0].split(' ')[0] );
            new_transform = g.getAttribute( 'transform' ).replace( /scale\([^\)]*\)/, 'scale(' + (current_scale + scaleLevel) + ')' );
            g.setAttribute( 'transform', new_transform );
        }
    });
    
});
