/**
 * Object to interact with the Stemmarest Middleware's API through high-level
 * functions.
 *
 * @type {StemmarestService}
 */
const chartService = StemmarestService;

class NodeDensityChart extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {}
  
  renderChart( options={} ) {
    // Get all reading information
    stemmaButtonsService.getAllReadings( TRADITION_STORE.state.selectedTradition.id ).then( (resp) => {
      if ( resp.success ) {
        this.render( resp.data, options );
      } else {
        StemmawebAlert.show(
          `Could not fetch reading information for variance map: ${resp.message}`,
          'danger'
        );                
      }
    } );
  }


  /**
   * Renders a chart representing the number of nodes (y)
   * on each rank (x), for overview and navigational purposes.
   * 
   * @param [{}] readingData - reading data to base the chart on. 
   * @param {{}} options - Additional options for this method. 
   * @returns void. 
   */
  render( readingData, options={} ) {
    const defaultOptions = { 'onEnd': null, 'display': 'none', 'opacity': 0 };
    const usedOptions = { ...defaultOptions, ...options };

    const sections = new Map();
    // NOTE: For literal object insertion order is preserved for string like keys
    // and ascending order for "number like". So rank ordering is for 'free'.
    // However, section ids are e.g. [ 1220, 21, 40 ] that is: in reading order,
    // not sequentially numbered order. Casting section numbers to string, or even
    // encapsulating them as a single value array does not help. JS forcefully 
    // orders the properties in ascending number order. Turning the keys into
    // Objects doesn't work either: they are seen as one and the same key (which is
    // weird btw.) Therefore we finally turn to Map() to retain inserting order.
    readingData.forEach( reading => {
      const sectionKey = reading.section;
      if ( sections.get( sectionKey ) ) {
        var rankCounter = sections.get( sectionKey );
        if ( rankCounter[ reading.rank ] ) { 
          rankCounter[ reading.rank ].readingCounts.push( reading.witnesses.length );
        } else {
          rankCounter[ reading.rank ] = { 
            'rank': reading.rank,
            'readingCounts': [reading.witnesses.length] 
          }
        }
      } else {
        sections.set( sectionKey, {} );
        sections.get( sectionKey )[ reading.rank ] = { 
          'rank': reading.rank,
          'readingCounts': [reading.witnesses.length] 
        }
      }
    } );

    // Flatten the Map so that we end up with an array
    // of literal objects having { sectionId, rank, node count, reading count }.
    var data = [];
    var idx = 0;
    for ( const [section, rankCounter] of sections ) {
      Object.keys( rankCounter ).forEach( ( key ) => {
        data.push( { 'aggregatedRank': idx, 'section': section, ...rankCounter[ key ] } )
        idx += 1;
      } ); 
    }

    // Compute entropy on each rank.
    const witnessCount = TRADITION_STORE.state.selectedTradition.witnesses.length;
    var ent = 0;
    data = data.map( (d) => { 
      const nullReadings = witnessCount - d.readingCounts.reduce( ( partSum, readingCount ) => partSum + readingCount );
      if( nullReadings != 0 ) {
        d.readingCounts.push( nullReadings );
      }
      // Essentially it's the entropy of a histogram.
      ent = 0
      for ( var c of d.readingCounts ) {
        ent -= c * Math.log( c );
      }
      d['entropy'] = ent;
      return d;
    } )


    // Render the container
    this.innerHTML = `
        <div class="position-sticky pt-2" style="display: ${usedOptions.display}; opacity: ${usedOptions.opacity};">
            <h6 class="sidebar-heading d-flex justify-content-between align-items-center px-3 mt-2 text-muted">
               <span>Mini Map</span>
            </h6>
            <div class="px-3 py-1">
              <div id="node-density-chart-svg-container">
              </div>
            </div>
        </div>
    `;

    // append the svg object to the body of the page
    const vbHeight = 74;
    const vbWidth = 350;
    const chartPadding = 12;

    const svg = d3.select( '#node-density-chart-svg-container' )
      .append( 'svg' )
      .attr( 'width', '100%' )
      .attr( 'viewBox', `0 0 ${vbWidth} ${vbHeight}` )
      .append( 'g' );

    // compute X domain and range
    var x = d3.scaleLinear()
      .domain( d3.extent(data, function(d) { return d.aggregatedRank; } ) )
      .range( [ 0, vbWidth ] );
  
    // compute Y domain and range
    // We set to domain minimum to 1: there is never zero nodes on a rank.
    // And we adjust the range -1 so it fits snugly within the view box's height.
    const offSet = 1;
    var y = d3.scaleLinear()
      .domain( d3.extent( data, function(d) { return d.entropy; } ) )
      .range( [ vbHeight-offSet-chartPadding , chartPadding ] );

      // Add X vs. Y chart line
      svg.append( 'path' )
      .datum( data )
      .attr( 'id', 'minimap-chart-line' )
      .attr( 'class', 'chart-line' )
      .attr( 'd', d3.line()
        .x( function(d) { return x( d.aggregatedRank ) } )
        .y( function(d) { return y( d.entropy ) } )
      );
    
    // Aggregate information for start, end, and sectionId of sections in minimap.
    const sectionStartXs = data.filter( (d) => d.rank == 0 );
    const sectionEndXs = sectionStartXs.slice().map( (d) => d.aggregatedRank );
    sectionEndXs.shift();
    sectionEndXs.push( data.length );
    const sectionXs = sectionStartXs.map( ( d, idx ) => { return { 
      'idx':idx, 'section':d.section, 'xStart':d.aggregatedRank, 'xEnd':sectionEndXs[idx]
    } } );

    // Alternate the background colors of the sections in the minimap.
    const bgIntensity = [ 'dark', 'light' ];
    const chartG = d3.select( '#node-density-chart-svg-container svg g' );
    chartG
      .selectAll( 'rect' )
      .data( sectionXs )
      .enter()
      .insert( 'rect', 'path' )
      .attr( 'id', (d) => `section-rect-${d.section}` )
      .attr( 'x', (d) => x( d.xStart ) )
      .attr( 'width', (d) => ( x( d.xEnd ) -  x( d.xStart ) ) )
      .attr( 'height', vbHeight )
      .attr( 'class', (d) => `node-density-chart-section-bg-${bgIntensity[d.idx%2]}` )
      .on( 'click', ( evt, d ) => { 
        // Compute position that corresponds with clicked x position in section in minimap
        // as a ratio of that position in comparison to the length of the section in the minimap.
        const xClickRange = x( d.xEnd ) - x( d.xStart );
        const xTarget = document.querySelector( `#section-rect-${d.section}` );
        const xClick = d3.pointer( evt, xTarget )[0] - x( d.xStart );
        const xRatio = xClick/xClickRange;
        relationRenderer.panXRatio = xRatio;
        if ( d.section != SECTION_STORE.state.selectedSection.id ) {
          console.log( 'ndcdebug: clicked a different section' );
          const selectedSection = SECTION_STORE.state.availableSections.filter( (section) => section.id == d.section )[0];
          // This causes TWO rerenders!
          SECTION_STORE.setSelectedSection( selectedSection );
        } else {
          console.log( 'ndcdebug: clicked in the same section' );
          relationRenderer.pan();
        }
      } );
    if( usedOptions.onEnd ) {
        usedOptions.onEnd();
    }
  }

  unrender() {
    fadeToDisplayNone( document.querySelector( 'node-density-chart div' ) );
  }

  showPanPosition( panXRatio, extentRatio ) {
    console.log( 'ndcdebug: showPanPosition called' );

    // Calculate dimensions we will need in any case
    const sectionId = SECTION_STORE.state.selectedSection.id;
    const rectElement = document.querySelector( `#section-rect-${sectionId}` );
    const minX = parseFloat( rectElement.getAttribute( 'x' ) );
    const width = parseFloat( rectElement.getAttribute( 'width' ) );
    const maxX = minX + width;
    var rectX = minX + ( panXRatio * width );
    var rectExtentX = extentRatio * width;
    // Left side constraints
    if( rectX < minX ){ 
      rectExtentX = rectExtentX - ( minX - rectX );
      if( rectExtentX < 2 ){ rectExtentX = 2 };
      rectX = minX; 
    };
    // Right side constraints
    if( rectX > maxX - 2 ){ rectX = maxX - 2 }
    if( rectX + rectExtentX > minX + width ){
      rectExtentX = maxX - rectX;
    };

    console.log( rectElement.getAttribute( 'x' ), panXRatio );
    console.log( 'ndcdebug: rectX:', rectX, 'rectExtentX', rectExtentX, 'minX:', minX, 'width:', width );

    var indicator = d3.select( '#pan-position-indicator' );

    // If there is no indicator yet, put it in
    if( indicator.empty() ) {
      console.log( 'ndcdebug: putting in the pan indicator' );
      const height = parseFloat( rectElement.getAttribute( 'height' ) );
      const minimapGElement = d3.select( rectElement.parentElement );
      indicator = minimapGElement.insert( 'rect', '#minimap-chart-line' )
        .attr( 'id', 'pan-position-indicator' )
        .attr( 'x', rectX )
        .attr( 'width', rectExtentX )
        .attr( 'height', height )
    } else {  // Hoever, if there is an indicator, just change x and width appropriately.
      indicator
        .attr( 'x', rectX )
        .attr( 'width', rectExtentX )
    }

    // Always add (overwrite) dragging behavior
    // Actually this would only be needed on section change
    // and on graph zoom.
    // Is this what we want to get away from here?
    indicator.call( d3.drag().on( 'drag', (event) => {
      const currentMinX = Number( indicator.attr( 'x' ) );
      const currentMaxX = currentMinX + Number( indicator.attr( 'width' ) );
      console.log( 'ndcdebug: minX', minX, 'maxX:', maxX, 'currentMinX:', currentMinX, 'currentMaxX', currentMaxX );
      // If the drag event x is inside of the area that we want to consider draggable
      // i.e. if the mouse cursor is within the x span of the indicator…
      if( ( event.x > minX ) && ( event.x < maxX ) ){
        // Then we will move the indicator, if it does not mean moving it outside the
        // area where it can be dragged.
        if( ( currentMinX + event.dx > minX ) && ( ( currentMaxX + event.dx ) < maxX ) ){
          const newX = Number( indicator.attr( 'x' ) ) + event.dx;
          indicator.attr( 'x', newX );
          const xRatio = ( newX - minX )/( maxX - minX );
          console.log( 'ndcdebug: xRatio by drag:', newX, maxX, minX, xRatio );
          console.log( 'ndcdebug: minX', minX );
          relationRenderer.panXRatio = xRatio;
          relationRenderer.panCause = 'drag';
          relationRenderer.pan();
        }
      }
    } ) );
    
  }

}

customElements.define( 'node-density-chart', NodeDensityChart );