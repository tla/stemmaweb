function loadTradition( textid ) {
	$('#stemma_graph').load( "stemma/" + textid , function() {
    	var stemma_svg_element = $('#stemma_graph svg').svg().svg('get').root();
    	stemma_svg_element.height.baseVal.value = $('#stemma_graph').height();
	});
    $('#variant_graph').load( "variantgraph/" + textid , function() {
    	var variant_svg_element = $('#variant_graph svg').svg().svg('get').root();
    	var svg_height = variant_svg_element.height.baseVal.value;
    	var svg_width = variant_svg_element.width.baseVal.value;
    	var container_height = $('#variant_graph').height();
    	variant_svg_element.height.baseVal.value = container_height;
    	variant_svg_element.width.baseVal.value = (svg_width/svg_height * container_height);
	});
}
