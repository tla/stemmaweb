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
    	$('#open_stemweb_ui').show();
    	$('#open_textinfo_edit').show();
    	$('#relatebutton_label').text('View collation and edit relationships');
    } else {
    	$('#open_stemma_add').hide();
    	$('#open_stemweb_ui').hide();
    	$('#open_textinfo_edit').hide();
    	$('#relatebutton_label').text('View collation and relationships');
    }

    // Then get and load the actual content.
    // TODO: scale #stemma_graph both horizontally and vertically
    // TODO: load svgs from SVG.Jquery (to make scaling react in Safari)
    $.getJSON( _get_url([ "textinfo", textid ]), function (textdata) {
    	// Add the scalar data
    	selectedTextInfo = textdata;
    	load_textinfo();
     	// Add the stemma(ta)
    	stemmata = textdata.stemmata;
    	if( stemmata.length ) {
    		selectedStemmaID = 0;
    	} else {
    		selectedStemmaID = -1;
		}
		load_stemma( selectedStemmaID, editable );
    	// Set up the relationship mapper button
		$('#run_relater').attr( 'action', _get_url([ "relation", textid ]) );
		// Set up the download button
		$('#dl_tradition').attr( 'href', _get_url([ "download", textid ]) );
		$('#dl_tradition').attr( 'download', selectedTextInfo.name + '.xml' );
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
		var owneremail = selectedTextInfo.owner;
		var chop = owneremail.indexOf( '@' );
		if( chop > -1 ) {
			owneremail = owneremail.substr( 0, chop + 1 ) + '...';
		}
		$('#owner_id').empty().append( owneremail );
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
function show_stemmapager ( editable ) {
      $('.pager_left_button').unbind('click').addClass( 'greyed_out' );
      $('.pager_right_button').unbind('click').addClass( 'greyed_out' );
      if( selectedStemmaID > 0 ) {
              $('.pager_left_button').click( function () {
                      load_stemma( selectedStemmaID - 1, editable );
              }).removeClass( 'greyed_out' );
      }       
      if( selectedStemmaID + 1 < stemmata.length ) {
              $('.pager_right_button').click( function () {
                      load_stemma( selectedStemmaID + 1, editable );
              }).removeClass( 'greyed_out' );
      }
}

// Load a given stemma SVG into the stemmagraph box.
function load_stemma( idx, editable ) {
	// Load the stemma at idx
	selectedStemmaID = idx;
	show_stemmapager( editable );
	$('#open_stemma_edit').hide();
	$('#run_stexaminer').hide();
	$('#stemma_identifier').empty();
	if( idx > -1 ) {
		// Load the stemma and its properties
		var stemmadata = stemmata[idx];
		if( editable ) {
			$('#open_stemma_edit').show();
		}
		if( stemmadata.directed ) {
			// Stexaminer submit action
			var stexpath = _get_url([ "stexaminer", selectedTextID, idx ]);
			$('#run_stexaminer').attr( 'action', stexpath );
			$('#run_stexaminer').show();
		}
		loadSVG( stemmadata.svg );
		$('#stemma_identifier').text( stemmadata.name );
        setTimeout( 'start_element_height = $("#stemma_graph .node")[0].getBBox().height;', 500 );
	}
}

// Load the SVG we are given
function loadSVG(svgData) {
	var svgElement = $('#stemma_graph');

	$(svgElement).svg('destroy');

	$(svgElement).svg({
		loadURL: svgData,
		onLoad : function () {
			var theSVG = svgElement.find('svg');
			var svgoffset = theSVG.offset();
			var browseroffset = 1;
			// Firefox needs a different offset, stupidly enough
			if( navigator.userAgent.indexOf('Firefox') > -1 ) {
				browseroffset = 3; // works for tall images
				// ...but if the SVG is wider than it is tall, Firefox treats
				// the top as being the top of the graph, loaded into the middle
				// of the canvas, but then the margin at the top of the canvas
				// extends upward. So we have to find the actual top of the canvas
				// and correct for *that* instead.
				var vbdim = svgElement.svg().svg('get').root().viewBox.baseVal;
				if( vbdim.height < vbdim.width ) {
					var vbscale = svgElement.width() / vbdim.width;
					var vbrealheight = vbdim.height * vbscale;
					browseroffset = 3 + ( svgElement.height() - vbrealheight ) / 2;
				}
			}
			var topoffset = theSVG.position().top - svgElement.position().top - browseroffset;
			theSVG.offset({ top: svgoffset.top - topoffset, left: svgoffset.left });
		}
	});
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

// Event to enable the upload button when a file has been selected
function file_selected( e ) {
	if( e.files.length == 1 ) {
		$('#upload_button').button('enable');
		$('#new_file_name_container').html( '<span id="new_file_name">' + e.files[0].name + '</span>' );
	} else {
		$('#upload_button').button('disable');
		$('#new_file_name_container').html( '(Use \'pick file\' to select a tradition file to upload.)' );
	}
}

// Implement our own AJAX method that uses the features of XMLHttpRequest2
// but try to let it have a similar interface to jquery.post
// The data var needs to be a FormData() object.
// The callback will be given a single argument, which is the response data
// of the given type.

function post_xhr2( url, data, cb, type ) {
	if( !type ) {
		type = 'json';
	}
	var xhr = new XMLHttpRequest();
	// Set the expected response type
	if( type === 'data' ) {
		xhr.responseType = 'blob';
	} else if( type === 'xml' ) {
		xhr.responseType = 'document';
	} 
	// Post the form
	// Gin up an AJAX settings object
	$.ajaxSetup({ url: url, type: 'POST' });
	xhr.open( 'POST', url, true );
	// Handle the results
	xhr.onload = function( e ) {
		// Get the response and parse it
		// Call the callback with the response, whatever it was
		var xhrs = e.target;
		if( xhrs.status > 199 && xhrs.status < 300  ) { // Success
			var resp;
			if( type === 'json' ) {
				resp = $.parseJSON( xhrs.responseText );
			} else if ( type === 'xml' ) {
				resp = xhrs.responseXML;
			} else if ( type === 'text' ) {
				resp = xhrs.responseText;
			} else {
				resp = xhrs.response;
			}
			cb( resp );
		} else {
			// Trigger the ajaxError...
			_trigger_ajaxerror( e );
		}
	};
	xhr.onerror = _trigger_ajaxerror;
	xhr.onabort = _trigger_ajaxerror;
	xhr.send( data );
}

function _trigger_ajaxerror( e ) {
	var xhr = e.target;
	var thrown = xhr.statusText || 'Request error';
	jQuery.event.trigger( 'ajaxError', [ xhr, $.ajaxSettings, thrown ]);
}

function upload_new () {
	// Serialize the upload form, get the file and attach it to the request,
	// POST the lot and handle the response.
	var newfile = $('#new_file').get(0).files[0];
	var reader = new FileReader();
	reader.onload = function( evt ) {
		var data = new FormData();
		$.each( $('#new_tradition').serializeArray(), function( i, o ) {
				data.append( o.name, o.value );
			});
		data.append( 'file', newfile );
		var upload_url = _get_url([ 'newtradition' ]);
		post_xhr2( upload_url, data, function( ret ) {
			if( ret.id ) {
				$('#upload-collation-dialog').dialog('close');
				refreshDirectory();
				loadTradition( ret.id, ret.name, 1 );
			} else if( ret.error ) {
				$('#upload_status').empty().append( 
					$('<span>').attr('class', 'error').append( ret.error ) );
			}
		}, 'json' );
	};
	reader.onerror = function( evt ) {
		var err_resp = 'File read error';
		if( e.name == 'NotFoundError' ) {
			err_resp = 'File not found';
		} else if ( e.name == 'NotReadableError' ) {
			err_resp == 'File unreadable - is it yours?';
		} else if ( e.name == 'EncodingError' ) {
			err_resp == 'File cannot be encoded - is it too long?';
		} else if ( e.name == 'SecurityError' ) {
			err_resp == 'File read security error';
		}
		// Fake a jqXHR object that we can pass to our generic error handler.
		var jqxhr = { responseText: '{error:"' + err_resp + '"}' };
		display_error( jqxhr, $('#upload_status') );
		$('#upload_button').button('disable');
	}
	
	reader.readAsBinaryString( newfile );
}

// Utility function to neatly construct an application URL
function _get_url( els ) {
	return basepath + els.join('/');
}


$(document).ready( function() {
	// See if we have the browser functionality we need
	// TODO Also think of a test for SVG readiness
	if( !!window.FileReader && !!window.File ) {
		$('#compatibility_check').empty();
	}
	
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
					delete data.stemmaid;
					// Stash the answer in the appropriate spot in our stemma array
					stemmata[selectedStemmaID] = data;
					// Display the new stemma
					load_stemma( selectedStemmaID, true );
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
				$('#dot_field').val( "digraph \"NAME STEMMA HERE\" {\n\n}" );
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

	$('#stemweb-ui-dialog').dialog({
		autoOpen: false,
		height: 200,
		width: 300,
		modal: true,
		buttons: {
			Run: function (evt) {
				$("#stemweb_run_status").empty();
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
					delete data.stemmaid;
					// Stash the answer in the appropriate spot in our stemma array
					stemmata[selectedStemmaID] = data;
					// Display the new stemma
					load_stemma( selectedStemmaID, true );
					// Reenable the button and close the form
					$(evt.target).button("enable");
					$('#stemma-edit-dialog').dialog('close');
				}, 'json' );
			},
			Cancel: function() {
				$('#stemweb-ui-dialog').dialog('close');
			}
		},
		create: function(evt) {
			// Call out to Stemweb to get the algorithm options, with which we
			// populate the form.
			var algorithmTypes = {};
			var algorithmArgs = {};
			$.each( stemwebAlgorithms, function( i, o ) {
				// If it's an algorithmarg, skip it for now
				if( o.model === 'algorithms.algorithm' ) {
					algorithmTypes[ o.pk ] = o.fields;
				} else {
					// it's an arg
					algorithmArgs[ o.pk ] = o.fields;
				}
			});
			$.each( algorithmTypes, function( pk, fields ) {
				var algopt = $('<option>').attr( 'value', pk ).append( fields.name );
				$('#stemweb_algorithm').append( algopt );
			});
			// TODO add the algorithm args
		},
		open: function(evt) {
			$("#stemweb_run_status").empty();
		},
	}).ajaxError( function(event, jqXHR, ajaxSettings, thrownError) {
		$(event.target).parent().find('.ui-button').button("enable");
    	if( ajaxSettings.url.indexOf( 'algorithms' ) > -1 
    		&& ajaxSettings.type == 'POST' ) {
			display_error( jqXHR, $("#stemweb_run_status") );
    	}
	});
		
	$('#upload-collation-dialog').dialog({
		autoOpen: false,
		height: 360,
		width: 480,
		modal: true,
		buttons: {
		  upload: {
		    text: 'Upload',
		    id: 'upload_button',
		    click: function() {
			    $('#upload_status').empty();
			    $('#upload_button').button("disable");
                upload_new();
            }
		  },
		  pick_file: {
		    text: 'Pick File',
		    id: 'pick_file_button',
		    click: function() {
                $('#new_file').click();
            }
		  },
		  Cancel: function() {
		    $('#upload-collation-dialog').dialog('close');
		  }
		},
		open: function() {
			// Set the upload button to its correct state based on
			// whether a file is loaded
			file_selected( $('#new_file').get(0) );
			$('#upload_status').empty();
		}
	}).ajaxError( function(event, jqXHR, ajaxSettings, thrownError) {
		// Reset button state
		file_selected( $('#new_file').get(0) );
		// Display error message if applicable
    	if( ajaxSettings.url.indexOf( 'newtradition' ) > -1 
    		&& ajaxSettings.type == 'POST' ) {
			display_error( jqXHR, $("#upload_status") );
    	}
	});;
	
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
