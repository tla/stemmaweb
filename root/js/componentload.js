function loadTradition( textid ) {
	$('#stemma_graph').load( "stemma/" + textid );
	$('#stemma_graph > svg').width('485px');
	$('#variant_graph').load( "variantgraph/" + textid );
	$('#variant_graph > svg').height('300px');
}