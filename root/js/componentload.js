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
    $.getJSON( basepath + "/textinfo/" + textid, function (textdata) {
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
		load_stemma( selectedStemmaID, basepath );
    	// Set up the relationship mapper button
		$('#run_relater').attr( 'action', basepath + "/relation/" + textid );
	});
}

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

function show_stemmapager () {
      $('.pager_left_button').unbind('click').css( 'opacity', '0.5' );
      $('.pager_right_button').unbind('click').css( 'opacity', '0.5' );
      if( selectedStemmaID > 0 ) {
              $('.pager_left_button').click( function () {
                      load_stemma( selectedStemmaID - 1 );
              }).css( 'opacity' , '1.0' );
      }       
      if( selectedStemmaID + 1 < stemmata.length ) {
              $('.pager_right_button').click( function () {
                      load_stemma( selectedStemmaID + 1 );
              }).css( 'opacity' , '1.0' );
      }
}


function load_stemma( idx ) {
	// Load the stemma at idx
	selectedStemmaID = idx;
	show_stemmapager();
	if( idx > -1 ) {
		$('#stemma_graph').empty();
		$('#stemma_graph').append( stemmata[idx] );
		// Stexaminer submit action
		var stexpath = basepath + "/stexaminer/" + selectedTextID + "/" + idx;
		$('#run_stexaminer').attr( 'action', stexpath );
        setTimeout( 'start_element_height = $("#stemma_graph .node")[0].getBBox().height;', 500 );
	}
}

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