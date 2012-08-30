function loadTradition( textid, textname, editable ) {
	selectedTextID = textid;
    // First insert the placeholder image and register an error handler
    var basepath = window.location.pathname
    if( basepath.lastIndexOf('/') == basepath.length - 1 ) { 
    	basepath = basepath.slice( 0, basepath.length - 1) 
    };
    $('#stemma_graph').empty();
    $('#textinfo_waitbox').show();
    $('#textinfo_container').ajaxError( 
    	function ( e, jqxhr, settings, exception ) {
			if ( settings.url.indexOf( 'textinfo' ) > -1 ) {
		    	$('#textinfo_waitbox').hide();
				var msg = "An error occurred: ";
				var msghtml = $('<span>').attr('class', 'error').text(
					msg + jqxhr.status + " " + jqxhr.statusText);
				$("#textinfo_container").append( msghtml ).show();
			} 
    	}
    );
    // Then get and load the actual content.
    // TODO: scale #stemma_graph both horizontally and vertically
    // TODO: load svgs from SVG.Jquery (to make scaling react in Safari)
    $.getJSON( basepath + "/textinfo/" + textid, function (textdata) {
    	// Add the scalar data
    	$('#textinfo_waitbox').hide();
		$('#textinfo_container').show();
    	$('.texttitle').empty().append( textdata.traditionname );
    	$('#witness_num').empty().append( textdata.witnesses.size );
    	$('#witness_list').empty().append( textdata.witnesses.join( ', ' ) );
    	$('#reading_num').empty().append( textdata.readings );
    	$('#relationship_num').empty().append( textdata.relationships );
    	// Add the stemma(ta) and set up the stexaminer button
    	stemmata = textdata.stemmata;
    	if( stemmata.length ) {
    		selectedStemmaID = 0;
    		load_stemma( selectedStemmaID, basepath );
    	}
    	// Set up the relationship mapper button
		$('#run_relater').attr( 'action', basepath + "/relation/" + textid );
	});
}

function load_stemma( idx, basepath ) {
	if( idx > -1 ) {
		selectedStemmaID = idx;
		$('#stemma_graph').empty();
		$('#stemma_graph').append( stemmata[idx] );
		// Stexaminer submit action
		var stexpath = basepath + "/stexaminer/" + selectedTextID + "/" + idx;
		$('#run_stexaminer').attr( 'action', stexpath );
	}
}
