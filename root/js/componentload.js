function loadTradition( textid, textname ) {
    // First insert the placeholder image
    var basepath = window.location.pathname
    if( basepath.lastIndexOf('/') == basepath.length - 1 ) { 
    	basepath = basepath.slice( 0, basepath.length - 1) 
    };
    var imghtml = '<img src="' + basepath + '/images/ajax-loader.gif" alt="Loading SVG..."/>'
    $('#stemma_graph').empty();
    $('#stemma_graph').append( imghtml );
    // Then get and load the actual content.
    // TODO: scale #stemma_grpah both horizontally and vertically
    // TODO: load svgs from SVG.Jquery (to make scaling react in Safari)
	$('#stemma_graph').load( basepath + "/stemma/" + textid );
	
	// Then populate the various elements with the right text name/ID.
	// Stemma and variant graph titles
	$('.texttitle').empty();
	$('.texttitle').append( textname );
	// Stexaminer submit action
	$('#run_stexaminer').attr( 'action', basepath + "/stexaminer/" + textid );
	// Relationship mapper submit action
	$('#run_relater').attr( 'action', basepath + "/relation/" + textid );
}
