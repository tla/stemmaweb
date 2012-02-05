function loadTradition( textid, textname ) {
    // First insert the placeholder image
    var basepath = window.location.pathname
    if( basepath.lastIndexOf('/') == basepath.length - 1 ) { 
    	basepath = basepath.slice( 0, basepath.length - 1) 
    };
    var imghtml = '<img src="' + basepath + '/images/ajax-loader.gif" alt="Loading SVG..."/>'
    $('#stemma_graph').empty();
    $('#variant_graph').empty();
    $('#stemma_graph').append( imghtml );
    $('#variant_graph').append( imghtml );
    // Then get and load the actual content.
    // TODO: scale #stemma_grpah both horizontally and vertically
    // TODO: load svgs from SVG.Jquery (to make scaling react in Safari)
	$('#stemma_graph').load( basepath + "/stemma/" + textid , function() {
    	var stemma_svg_element = $('#stemma_graph svg').svg().svg('get').root();
    	console.log( stemma_svg_element );
    	stemma_svg_element.height.baseVal.value = $('#stemma_graph').height();
	});
    $('#variant_graph').load( basepath + "/variantgraph/" + textid , function() {
    	var variant_svg_element = $('#variant_graph svg').svg().svg('get').root();
    	var svg_height = variant_svg_element.height.baseVal.value;
    	var svg_width = variant_svg_element.width.baseVal.value;
    	var container_height = $('#variant_graph').height();
    	variant_svg_element.height.baseVal.value = container_height;
    	variant_svg_element.width.baseVal.value = (svg_width/svg_height * container_height);
	});
	
	// Then populate the various elements with the right text name/ID.
	// Stemma and variant graph titles
	$('.texttitle').empty();
	$('.texttitle').append( textname );
	// Stexaminer submit action
	$('#run_stexaminer').attr( 'action', basepath + "/stexaminer/" + textid );
	// Relationship mapper submit action
	$('#run_relater').attr( 'action', basepath + "/relation/" + textid );
}
