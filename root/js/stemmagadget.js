var colors = ['#ffeeaa','#afc6e9','#d5fff6','#ffccaa','#ffaaaa','#e5ff80','#e5d5ff','#ffd5e5'];

$(document).ready(function() {
  $('svg').width('485px');
})



function load_stemma_svg( topic, data, subscriberData ) {
    var params = {};
	var postData = {};

	postData.textid = data;

	params[gadgets.io.RequestParameters.METHOD] = gadgets.io.MethodType.POST;
	params[gadgets.io.RequestParameters.POST_DATA] = gadgets.io.encodeValues(postData);
	var url = "http://eccentricity.org:3000/svg_service";

	gadgets.io.makeRequest(url,
		function (o) {
			displaySVG(o.text);
		}, params);
	
}

function loaded() {
	gadgets.window.adjustHeight(400);
	subId = gadgets.Hub.subscribe("interedition.svg.dot.coloring", do_color_nodes);
	subId = gadgets.Hub.subscribe("interedition.svg.dot.decoloring", de_color_nodes);
	subId = gadgets.Hub.subscribe("interedition.tradition.selected", load_stemma_svg);
}

if (gadgets.util.hasFeature('pubsub-2')) {
	gadgets.HubSettings.onConnect = function(hum, suc, err) { loaded(); };
}
else gadgets.util.registerOnLoadHandler(loaded);
