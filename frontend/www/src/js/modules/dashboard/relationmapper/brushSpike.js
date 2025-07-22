const d3 = libraries.lib_d3;

const test_data = {"43": 2, "58": 2, "1220": 2, "1221": 2, "1261": 1, "44": 1, "1280": 2, "1281": 2, "1282": 1, "1279": 2, "1283": 2, "1284": 2, "1285": 1, "1286": 1, "1287": 2, "1288": 2, "1289": 1, "1290": 1, "1291": 1, "1292": 2, "1293": 2, "1294": 2, "1295": 2, "1296": 2, "1297": 2, "1298": 1, "1299": 2, "1300": 2, "1301": 1, "1302": 1, "1303": 1, "1304": 1, "1305": 1, "1306": 1, "1307": 1, "1308": 2, "1309": 1, "1310": 2, "1311": 1, "1312": 1, "1313": 2, "1314": 1, "1315": 2, "1316": 2, "1317": 1, "1318": 1, "1319": 2, "1320": 2, "1321": 1, "1322": 1, "1323": 2, "1324": 1, "1325": 1, "1327": 2, "1326": 2, "59": 1, "1222": 1, "1223": 1, "1224": 1, "1226": 2, "1225": 2, "1227": 2, "1228": 1, "1229": 2, "1230": 1, "1232": 2, "1231": 1, "1233": 2, "1234": 2, "1235": 1, "1236": 2, "1237": 2, "1238": 2, "1239": 1, "1240": 2, "1241": 1, "1242": 1, "1243": 2, "1244": 2, "1245": 2, "1246": 1, "1247": 1, "1248": 1, "1249": 1, "1250": 1, "1251": 1, "1252": 1, "1253": 1, "1254": 1, "1255": 2, "1256": 1, "1257": 2, "1258": 1, "1259": 1, "1260": 1, "1262": 2, "1263": 2, "1264": 1, "1265": 1, "1266": 2, "1267": 2, "1268": 2, "1269": 1, "1270": 1, "1271": 2, "1272": 2, "1273": 1, "1274": 1, "1275": 1, "1276": 1, "1277": 2, "1278": 2}

const test_var_graph = `digraph "section 'w'" { 
	graph [bgcolor="none", rankdir="LR"];
	node [fillcolor="white", fontsize="14", shape="ellipse", style="filled"];
	edge [arrowhead="open", color="#000000", fontcolor="#000000"];
	subgraph { rank=same 43 "#SILENT#" }
	"#SILENT#" [shape=diamond,color=white,penwidth=0,label=""];
	44->"#SILENT#" [color=white,penwidth=0];
	1280 [id="n1280", label="ὢν"];
	1279->1280 [label="majority", id="e1538", penwidth="3.2"];
	1281 [id="n1281", label="οἰκονομῆται"];
	1280->1281 [label="A, C, K, P, Q", id="e1539", penwidth="1.8"];
	1282 [id="n1282", label="οἰκονομεῖται"];
	1280->1282 [label="majority", id="e1540", penwidth="2.2"];
	1283 [id="n1283", label="ἐκ"];
	1281->1283 [label="A, C, K, P, Q", id="e1542", penwidth="1.8"];
	1282->1283 [label="majority", id="e1543", penwidth="2.2"];
	1284 [id="n1284", label="τῆς"];
	1283->1284 [label="majority", id="e1544", penwidth="3.2"];
	1285 [id="n1285", label="προνοίας"];
	1284->1285 [label="majority", id="e1545", penwidth="3.2"];
	1286 [id="n1286", label="ἐν"];
	1285->1286 [label="majority", id="e1546", penwidth="3.2"];
	1287 [id="n1287", label="συμφοραῖς,"];
	1286->1287 [label="majority", id="e1547", penwidth="3.2"];
	1288 [id="n1288", label="ἐν"];
	1287->1288 [label="majority", id="e1548", penwidth="3.2"];
	1289 [id="n1289", label="ἀνάγκαις,"];
	1288->1289 [label="majority", id="e1549", penwidth="3.2"];
	1290 [id="n1290", label="ἐν"];
	1289->1290 [label="majority", id="e1550", penwidth="3.2"];
	1291 [id="n1291", label="νόσοις"];
	1290->1291 [label="majority", id="e1551", penwidth="3.2"];
	1292 [id="n1292", label="ὡς"];
	1291->1292 [label="majority", id="e1552", penwidth="3.2"];
	1293 [id="n1293", label="οὐκ"];
	1292->1293 [label="majority", id="e1553", penwidth="3.2"];
	1294 [id="n1294", label="οἶδε"];
	1293->1294 [label="majority", id="e1554", penwidth="3.2"];
	1295 [id="n1295", label="γὰρ"];
	1294->1295 [label="majority", id="e1555", penwidth="3.2"];
	1296 [id="n1296", label="διὰ"];
	1295->1296 [label="majority", id="e1556", penwidth="3.2"];
	1297 [id="n1297", label="τῶν"];
	1296->1297 [label="majority", id="e1557", penwidth="3.2"];
	1298 [id="n1298", label="τοιούτων"];
	1297->1298 [label="majority", id="e1558", penwidth="3.2"];
	1299 [id="n1299", label="καθαίρει"];
	1298->1299 [label="majority", id="e1559", penwidth="3.0"];
	1300 [id="n1300", label="καθεαυτὸν"];
	1298->1300 [label="S", id="e1560", penwidth="1.0"];
	1301 [id="n1301", label="αὐτὸν"];
	1299->1301 [label="majority", id="e1562", penwidth="3.0"];
	1302 [id="n1302", label="ὁ"];
	1300->1302 [label="S", id="e1564", penwidth="1.0", minlen="2"];
	1301->1302 [label="majority", id="e1563", penwidth="3.0"];
	1303 [id="n1303", label="θεός"];
	1302->1303 [label="majority", id="e1565", penwidth="3.2"];
	1304 [id="n1304", label="οὖν"];
	1303->1304 [label="majority", id="e1566", penwidth="2.6"];
	1305 [id="n1305", label="τῷ"];
	1304->1305 [label="majority", id="e1567", penwidth="2.6"];
	1303->1305 [label="E, G", id="e1568", penwidth="1.2", minlen="2"];
	1306 [id="n1306", label="τῶν"];
	1303->1306 [label="K", id="e1569", penwidth="1.0", minlen="2"];
	1307 [id="n1307", label="ἐν"];
	1306->1307 [label="K", id="e1572", penwidth="1.0"];
	1305->1307 [label="majority", id="e1571", penwidth="3.0"];
	1308 [id="n1308", label="ἀπιστεία"];
	1307->1308 [label="A, D, P", id="e1573", penwidth="1.4"];
	1309 [id="n1309", label="ἀπιστίᾳ"];
	1307->1309 [label="majority", id="e1574", penwidth="2.6"];
	1310 [id="n1310", label="τὸν"];
	1309->1310 [label="majority", id="e1577", penwidth="2.6"];
	1308->1310 [label="A, D, P", id="e1576", penwidth="1.4"];
	1311 [id="n1311", label="βίον"];
	1310->1311 [label="majority", id="e1578", penwidth="3.2"];
	1312 [id="n1312", label="κατακλείσαντι"];
	1311->1312 [label="majority", id="e1579", penwidth="2.4"];
	1313 [id="n1313", label="κατακλύσαντι"];
	1311->1313 [label="E, G", id="e1580", penwidth="1.2"];
	1314 [id="n1314", label="καταλύσαντι"];
	1311->1314 [label="F, Q", id="e1581", penwidth="1.2"];
	1315 [id="n1315", label="οὔτε"];
	1314->1315 [label="F, Q", id="e1586", penwidth="1.2"];
	1312->1315 [label="majority", id="e1584", penwidth="2.4"];
	1313->1315 [label="E, G", id="e1585", penwidth="1.2"];
	1316 [id="n1316", label="ἐνταῦθα"];
	1315->1316 [label="majority", id="e1587", penwidth="3.2"];
	1317 [id="n1317", label="οὔτε"];
	1316->1317 [label="majority", id="e1588", penwidth="3.2"];
	1318 [id="n1318", label="ἐν"];
	1317->1318 [label="majority", id="e1589", penwidth="3.2"];
	1319 [id="n1319", label="τῷ"];
	1318->1319 [label="majority", id="e1590", penwidth="3.2"];
	1320 [id="n1320", label="μέλλοντι"];
	1319->1320 [label="majority", id="e1591", penwidth="3.2"];
	1321 [id="n1321", label="ἀφεθήσεται"];
	1320->1321 [label="majority", id="e1592", penwidth="3.2"];
	1322 [id="n1322", label="τῆς"];
	1321->1322 [label="majority", id="e1593", penwidth="3.2"];
	43 [id="__START__", label="#START#"];
	1323 [id="n1323", label="ἀπιστίας"];
	1322->1323 [label="majority", id="e1594", penwidth="3.2"];
	1324 [id="n1324", label="καὶ"];
	1323->1324 [label="majority", id="e1595", penwidth="3.2"];
	44 [id="__END__", label="#END#"];
	1327->44 [label="majority", id="e1599", penwidth="3.2"];
	1325 [id="n1325", label="ἀθεΐας"];
	1324->1325 [label="majority", id="e1596", penwidth="3.2"];
	1326 [id="n1326", label="ἡ"];
	1325->1326 [label="majority", id="e1597", penwidth="3.2"];
	1327 [id="n1327", label="ἁμαρτία."];
	1326->1327 [label="majority", id="e1598", penwidth="3.2"];
	58 [id="n58", label="Μαξίμου"];
	43->58 [label="A, F, H, K, P, S", id="e77", penwidth="2.0"];
	59 [id="n59", label="ἁγίου"];
	58->59 [label="F, H", id="e78", penwidth="1.2"];
	1220 [id="n1220", label="Ἡ"];
	43->1220 [label="D, E, Q, T", id="e1460", penwidth="1.6", minlen="3"];
	58->1220 [label="A, K, S", id="e79", penwidth="1.4", minlen="2"];
	59->1220 [label="F, H", id="e1461", penwidth="1.2"];
	1221 [id="n1221", label="περὶ"];
	58->1221 [label="P", id="e1464", penwidth="1.0", minlen="3"];
	43->1221 [label="C", id="e1463", penwidth="1.0", minlen="4"];
	1220->1221 [label="majority", id="e1462", penwidth="2.6"];
	1222 [id="n1222", label="τῆς"];
	1221->1222 [label="majority", id="e1465", penwidth="2.6"];
	1223 [id="n1223", label="τοῦ"];
	1222->1223 [label="majority", id="e1466", penwidth="2.6"];
	1221->1223 [label="H, Q", id="e1467", penwidth="1.2", minlen="2"];
	1224 [id="n1224", label="πνεύματος"];
	1223->1224 [label="majority", id="e1468", penwidth="2.2"];
	1225 [id="n1225", label="τοῦ"];
	1224->1225 [label="majority", id="e1469", penwidth="2.2"];
	1226 [id="n1226", label="ἁγίου"];
	1225->1226 [label="majority", id="e1470", penwidth="2.2"];
	1223->1226 [label="D, P, Q, S", id="e1471", penwidth="1.6", minlen="3"];
	1227 [id="n1227", label="πνεύματος"];
	1226->1227 [label="D, P, Q, S", id="e1472", penwidth="1.6"];
	1228 [id="n1228", label="βλασφημίας"];
	1226->1228 [label="majority", id="e1473", penwidth="2.2", minlen="2"];
	1227->1228 [label="D, P, S", id="e1474", penwidth="1.4"];
	1229 [id="n1229", label="βλασφημία"];
	1227->1229 [label="Q", id="e1475", penwidth="1.0"];
	1230 [id="n1230", label="ἀπορία"];
	1228->1230 [label="majority", id="e1477", penwidth="2.8"];
	1231 [id="n1231", label="αὐτόθι"];
	1230->1231 [label="majority", id="e1478", penwidth="2.4"];
	1232 [id="n1232", label="αὐτόθεν"];
	1229->1232 [label="Q", id="e1480", penwidth="1.0", minlen="2"];
	1230->1232 [label="E, K", id="e1479", penwidth="1.2"];
	1233 [id="n1233", label="ἔχει"];
	1232->1233 [label="E, K, Q", id="e1483", penwidth="1.4"];
	1231->1233 [label="majority", id="e1482", penwidth="2.2"];
	1234 [id="n1234", label="ἔχειν"];
	1231->1234 [label="P", id="e1484", penwidth="1.0"];
	1235 [id="n1235", label="τὴν"];
	1234->1235 [label="P", id="e1487", penwidth="1.0"];
	1233->1235 [label="majority", id="e1486", penwidth="2.8"];
	1236 [id="n1236", label="λύσιν·"];
	1235->1236 [label="majority", id="e1488", penwidth="3.0"];
	1237 [id="n1237", label="ὁ"];
	1236->1237 [label="majority", id="e1489", penwidth="3.0"];
	1238 [id="n1238", label="δὲ"];
	1237->1238 [label="majority", id="e1490", penwidth="3.0"];
	1239 [id="n1239", label="δεύτερος"];
	1238->1239 [label="majority", id="e1491", penwidth="3.0"];
	1240 [id="n1240", label="ἐστὶν"];
	1239->1240 [label="majority", id="e1492", penwidth="3.0"];
	1241 [id="n1241", label="οὗτος·"];
	1240->1241 [label="majority", id="e1493", penwidth="3.0"];
	1242 [id="n1242", label="ὅτάν"];
	1241->1242 [label="majority", id="e1494", penwidth="3.0"];
	1243 [id="n1243", label="τις"];
	1242->1243 [label="majority", id="e1495", penwidth="2.8"];
	1244 [id="n1244", label="ἐν"];
	1242->1244 [label="F", id="e1497", penwidth="1.0", minlen="2"];
	1243->1244 [label="majority", id="e1496", penwidth="2.8"];
	1245 [id="n1245", label="ἁμαρτίαις"];
	1244->1245 [label="majority", id="e1498", penwidth="3.0"];
	1246 [id="n1246", label="ἐνεχόμενος,"];
	1245->1246 [label="majority", id="e1499", penwidth="3.0"];
	1247 [id="n1247", label="ἀκούων"];
	1246->1247 [label="majority", id="e1500", penwidth="3.0"];
	1248 [id="n1248", label="δὲ"];
	1247->1248 [label="majority", id="e1501", penwidth="3.0"];
	1249 [id="n1249", label="τοῦ"];
	1248->1249 [label="majority", id="e1502", penwidth="3.0"];
	1250 [id="n1250", label="κυρίου"];
	1249->1250 [label="majority", id="e1503", penwidth="3.0"];
	1251 [id="n1251", label="λέγοντος"];
	1250->1251 [label="majority", id="e1504", penwidth="3.0"];
	1252 [id="n1252", label="μὴ"];
	1251->1252 [label="majority", id="e1505", penwidth="3.0"];
	1253 [id="n1253", label="κρίνετε"];
	1252->1253 [label="majority", id="e1506", penwidth="2.4"];
	1254 [id="n1254", label="κρίνεται"];
	1253->1254 [label="H", id="e1508", penwidth="1.0"];
	1252->1254 [label="A, D, T", id="e1507", penwidth="1.4", minlen="2"];
	1255 [id="n1255", label="φοβούμενος"];
	1254->1255 [label="A, D, H, T", id="e1509", penwidth="1.6"];
	1253->1255 [label="majority", id="e1510", penwidth="2.2", minlen="2"];
	1256 [id="n1256", label="οὐδένα"];
	1255->1256 [label="majority", id="e1511", penwidth="3.0"];
	1257 [id="n1257", label="κρίνει"];
	1256->1257 [label="majority", id="e1512", penwidth="2.2"];
	1258 [id="n1258", label="κρίνῃ"];
	1256->1258 [label="C, P, Q, S", id="e1513", penwidth="1.6"];
	1259 [id="n1259", label="ἐν"];
	1258->1259 [label="C, P, Q, S", id="e1516", penwidth="1.6"];
	1257->1259 [label="majority", id="e1515", penwidth="2.2"];
	1260 [id="n1260", label="τῇ"];
	1259->1260 [label="majority", id="e1517", penwidth="3.0"];
	1261 [id="n1261", label="ἐξετάσει"];
	1260->1261 [label="majority", id="e1518", penwidth="3.0"];
	43->1261 [label="G", id="e1519", penwidth="1.0", minlen="40"];
	1262 [id="n1262", label="τῶν"];
	1261->1262 [label="majority", id="e1520", penwidth="3.2"];
	1263 [id="n1263", label="βεβιωμένων"];
	1262->1263 [label="majority", id="e1521", penwidth="3.2"];
	1264 [id="n1264", label="ὡς"];
	1263->1264 [label="majority", id="e1522", penwidth="3.2"];
	1265 [id="n1265", label="φύλαξ"];
	1264->1265 [label="majority", id="e1523", penwidth="3.2"];
	1266 [id="n1266", label="τῆς"];
	1265->1266 [label="majority", id="e1524", penwidth="3.2"];
	1267 [id="n1267", label="ἐντολῆς"];
	1266->1267 [label="majority", id="e1525", penwidth="3.2"];
	1268 [id="n1268", label="οὐ"];
	1267->1268 [label="majority", id="e1526", penwidth="3.2"];
	1269 [id="n1269", label="κρίνεται·"];
	1268->1269 [label="majority", id="e1527", penwidth="3.2"];
	1270 [id="n1270", label="εἰ"];
	1269->1270 [label="majority", id="e1528", penwidth="3.2"];
	1271 [id="n1271", label="μὴ"];
	1270->1271 [label="majority", id="e1529", penwidth="3.2"];
	1272 [id="n1272", label="τὸ"];
	1271->1272 [label="majority", id="e1530", penwidth="3.2"];
	1273 [id="n1273", label="γενέσθαι"];
	1272->1273 [label="majority", id="e1531", penwidth="3.2"];
	1274 [id="n1274", label="πιστόν,"];
	1273->1274 [label="majority", id="e1532", penwidth="3.2"];
	1275 [id="n1275", label="εἰκότως"];
	1274->1275 [label="majority", id="e1533", penwidth="3.2"];
	1276 [id="n1276", label="ὅταν"];
	1275->1276 [label="majority", id="e1534", penwidth="3.2"];
	1277 [id="n1277", label="ἐν"];
	1276->1277 [label="majority", id="e1535", penwidth="3.2"];
	1278 [id="n1278", label="ἁμαρτίαις"];
	1277->1278 [label="majority", id="e1536", penwidth="3.2"];
	1279 [id="n1279", label="τίς"];
	1278->1279 [label="majority", id="e1537", penwidth="3.2"];
}
`

class BrushSpike extends HTMLElement {

    constructor() {
        super();
    }

    #baseTransform = '';
    #ACTIVATE = true;
    #DEACTIVATE = false;

    set baseTransform( transform ) {
        this.#baseTransform = transform;
    }
    get baseTransform() {
        return this.#baseTransform;
    }

    connectedCallback() {
        this.render();
        d3.select( '#the-graph-container' )
            .graphviz()
            .renderDot( test_var_graph )
            .zoom( false )
            .width( 950 )
            .height( 450 )
            // .logEvents( true )
            // .fit( true )
            .on( 'end', () => { 
                const g = d3.select( '#the-graph-container svg g' );
                const gCTM = g.node().transform.baseVal.getItem(2).matrix;
                this.baseTransform = { 'x': gCTM.e, 'y': gCTM.f };
                this.graphZoomPan( this.#ACTIVATE );
                this.graphNodesDrag( this.#ACTIVATE );
                d3.select( window )
                    .on( 'keydown', (event) => { this.onKeyDown.call( this, event ) } )
                    .on( 'keyup', (event) => { this.onKeyUp.call( this, event ) } ); 
            } );
    }


    onKeyDown( event ) {
        if( event.key == 'Shift' ){
            this.graphZoomPan( this.#DEACTIVATE );
            this.graphNodesDrag( this.#DEACTIVATE );
            this.graphBrush( this.#ACTIVATE );
        };
    }
    onKeyUp( event ) {
        if( event.key == 'Shift' ){
	        this.graphBrush( this.#DEACTIVATE );
            this.graphZoomPan( this.#ACTIVATE );
            this.graphNodesDrag( this.#ACTIVATE );
		}
    }

    graphZoomPan( zoomable ) {
        if( zoomable ){
            d3.select( '#the-graph-container' )
            .call( d3.zoom()
                .scaleExtent([0.2, 1.2])
                // `this` is always the object that owns the call, which is `#the-graph-container`
                // in this case. But we want this to be `the-graph`, hence we use `.call` to
                // pass the right 'owner' into the zoomed function. See also
                // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Function/call
                .on( 'zoom', ( {transform} ) => { this.zoomed.call( this, transform ) } )
            )
        } else {
            d3.select( '#the-graph-container' ).on( '.zoom', null );
        };
    }

    graphNodesDrag( draggable ) {
        const g = d3.select( '#the-graph-container svg' );
        if( draggable ){
            g.selectAll( 'g.node' )
                .attr( 'cursor', 'grab' )
                .call( d3.drag()
                    .on( 'start', this.dragstarted )
                    .on( 'drag', this.dragged )
                    .on( 'end', this.dragended ) 
                );
			g.selectAll( 'g.node' ).on( 'click', ()=>(console.log( 'click' ) ) );

        } else {
            // Unset draggability of nodes, d3.drag internally uses `.drag` for
            // the listeners; see https://d3js.org/d3-drag#_drag.
            g.selectAll( 'g' ).on( '.drag', null );
        }
    }

    graphBrush( brushable ) {
        if( brushable ){
            d3.select( '#the-graph-container svg' ).append('g')
            .call( d3.brush()
                .keyModifiers( false )
                .on( 'brush', ( event ) => {
                        if( event.selection ){
                        const [[x0, y0], [x1, y1]] = event.selection;
                        // Note that `event.selection` gets you the viewport coordinates 
                        // that the brush masks. You need to transform these into coordinates
                        // in the svg coordinate space. 
                        // (Note that for this you need to know an origin, in case of
                        // GraphViz.ja the upper left corner of the viewBox is (0,) when 
                        // no other default transformations are applied.)
                        // See `viewboxCoordinates2SVGCoordinates` for the actual transformation.
                        d3.selectAll( '#the-graph-container svg g g.node ellipse' )
                            .each( (d,i,nodes) => {
                                // What is the 'extent' of the brush mask in the svg coordinate space?
                                const [ x0Svg, y0Svg ] = this.viewboxCoordinates2SVGCoordinates( [x0, y0] );
                                const [ x1Svg, y1Svg ] = this.viewboxCoordinates2SVGCoordinates( [x1, y1] );
                                // What is de center x and y of an ellips in that space?
                                const cxEllipse = parseFloat( d.center.x ) + this.baseTransform.x; 
                                const cyEllipse = parseFloat( d.center.y ) + this.baseTransform.y;
                                // Does de mask cover the center of the ellipse (datum)? 
                                if ( cxEllipse>=x0Svg &&  cxEllipse<=x1Svg && cyEllipse>=y0Svg && cyEllipse<=y1Svg ) {
                                    d3.select( nodes[i] ).attr( 'stroke', 'red' );
                                } else {
                                    d3.select( nodes[i] ).attr( 'stroke', 'black' );
                                };
                            } );
                    }
                } ) ).attr( 'class', 'brush');
        } else {
            const brush = d3.select( '#the-graph-container svg g.brush' )
            brush.on( '.brush', null );
            brush.remove();
        }
    }

    viewboxCoordinates2SVGCoordinates( [ x, y ] ) {
        const currentTransform = d3.zoomTransform( d3.select( '#the-graph-container svg g' ).node() );
        return [ 
            ( (1/currentTransform.k) * ( x - currentTransform.x ) ), 
            ( (1/currentTransform.k) * ( y - currentTransform.y ) ) 
        ];
    }

    zoomed( transform ) {
        transform = transform.translate( this.baseTransform.x, this.baseTransform.y );
        d3.select( '#the-graph-container svg g' ).attr( 'transform', transform );
    }

    dragstarted() {
        const ellipse = d3.select( this );
        // ellipse.raise();
        ellipse.attr( 'cursor', 'grabbing' );
    }
    
    static getTranslate( node ){
        const baseVal = node.transform.baseVal;
        if( baseVal.length > 0 ){
            const matrix = baseVal.getItem( baseVal.length - 1 ).matrix; 
            return { 'x':parseFloat( matrix.e ), 'y':parseFloat( matrix.f ) };
        } else {
            return { 'x':0, 'y':0 };
        }
    }

    dragged(event, d) {
        const selection = d3.select( this );        
        const translate = BrushSpike.getTranslate( selection.node() );
        const newX = translate.x + parseFloat( event.dx );
        const newY = translate.y + parseFloat( event.dy );
        d3.select( this ).attr( 'transform', `translate(${newX} ${newY})` );
    }
    
    dragended() {
        d3.select( this ).attr( 'cursor', 'grab' );
    }

    render() {
        this.innerHTML = `
            <div id="the-graph-container" style="border: 1px solid green; overflow: hidden;">
            Hello world!
            </div>
            <div style="width:100px; height:100px; background-color:orange;">hh</div>
            <div id="logValues">
                <table>
                    <th>
                        <td>Screen</td><td>svg</td><td>n43</td><td>n58</td><td>n59</td><td>n1224</td>
                    </th>
                    <tr> 
                        <td>x0</td><td id="x0Val"></td><td id="x0SvgVal"></td><td id="n43dcxVal"></td><td id="n58dcxVal"></td><td id="n59dcxVal"></td><td id="n1224dcxVal"></td>
                    </tr>
                    <tr> 
                        <td>y0</td><td id="y0Val"></td><td id="y0SvgVal"></td><td id="n43dcyVal"></td><td id="n58dcyVal"></td><td id="n59dcyVal"></td><td id="n1224dcyVal"></td>
                    </tr>
                    <tr> 
                        <td>x1</td><td id="x1Val"></td><td id="x1SvgVal"></td><td></td><td></td><td></td><td></td>
                    </tr>
                    <tr> 
                        <td>y1</td><td id="y1Val"></td><td id="y1SvgVal"></td><td></td><td></td><td></td><td></td>
                    </tr>
                </table>
            </div>
            <div id="the-other" width="750" height="250">
                click me
            </div>
            `
    }

}

customElements.define( 'brush-spike', BrushSpike );
