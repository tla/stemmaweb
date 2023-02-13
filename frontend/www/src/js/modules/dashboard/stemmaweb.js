/**
 * @typedef {import('@types/stemmaweb').TraditionState} TraditionState
 *
 * @typedef {import('@types/stemmaweb').StemmaState} StemmaState
 *
 * @typedef {import('@types/stemmaweb').Tradition} Tradition
 * 
 * @typedef {import('@types/stemmaweb').Section} Section
 *
 * @typedef {import('@types/stemmaweb').Stemma} Stemma
 *
 * @typedef {import('d3-graphviz').Graphviz} Graphviz
 */

/** @type {import('d3')} */
const d3 = window.d3;

/** @type {import('feather-icons')} */
const feather = window.feather;
const textIcon = feather.icons['file-text'].toSvg();
const folderIcon = feather.icons['folder'].toSvg();

/** @type {import('bootstrap')} */
const bootstrap = window.bootstrap;

/** @type {import('save-svg-as-png').saveSvgAsPng} */
const saveSvgAsPng = window.saveSvgAsPng;

/**
 * Object to interact with the Stemmarest Middleware's API through high-level
 * functions.
 *
 * @type {StemmarestService}
 */
const service = stemmarestService;

/**
 * Constructs the graph root div governed by `graphviz` or returns the existing
 * one.
 *
 * @returns {Graphviz}
 */
function graphvizRoot() {
  const graph_area = d3.select('#graph_area');
  const selection = graph_area.select('#graph');
  const graph = selection.empty()
    ? graph_area.append('div').attr('id', 'graph')
    : selection;
  graph.style('height', '100%');
  return graph
    .graphviz()
    .width(graph.node().getBoundingClientRect().width)
    .height(graph.node().getBoundingClientRect().height)
    .fit(true);
}

function initStemmaweb() {
  function mellow_transition(transition) {
    return transition.delay(50).duration(1000).ease(d3.easeLinear);
  }

  function quick_fade_in(sel) {
    return sel
      .style('opacity', 0)
      .transition()
      .duration(500)
      .style('opacity', 1);
  }

  /**
   * @param {string} dot
   * @returns {string}
   */
  function ellipse_border_to_none(dot) {
    return dot.replace(
      '" {',
      '" {\n\t node [color=none style=filled fillcolor=white]'
    );
  }

  /**
   * Renders folder level list item for `Tradition` in the left
   * navigation sidebar. 
   * 
   * @param tradition{Tradition}
   */
  function renderTraditionListItem( tradition ) {
    return `
    <div class="tradition-list-item d-flex">
      <div class="folder-icon">${folderIcon}</div>
      <div>
        <a href="api/tradition/${tradition.id}" trad-id="${tradition.id}" class="nav-link">
          ${tradition.name}
       </a>
      </div>
    </div>`;
  }

  function toggleSectionList( evt, tradId ){
    const sectionListElement = d3.select( `section-list[trad-id="${tradId}"]` )
    sectionListElement.call( quick_fade_in )
      .classed( 'show', !sectionListElement.classed( 'show' ) );
  }

  /**
   * Renders the supplied array of `Tradition` as a list with clickable items.
   *
   * @param traditions {Tradition[]}
   */
  function renderTraditionList(traditions) {
    // Clear the list
    document.getElementById('traditions-list').innerHTML = '';
    let traditionsList = d3
      .select('#traditions-list')
      .selectAll('li')
      .data(traditions, (d) => d.id);
    traditionsList.exit().remove();
    traditionsList = traditionsList
      .enter()
      .append('li')
      .merge(traditionsList);
    traditionsList.classed('nav-item', true)
      .html( renderTraditionListItem )
      .select( 'div div.folder-icon' ).on( 'click', (evt,d) => { toggleSectionList( evt, d.id ) } );
    traditionsList.append( 'div' )
      .html( (d) => `<section-list trad-id="${d.id}" class="collapse"></section-list>` );
    traditionsList
      .select( 'div div a' ).on('click', selectTradition );
  }

  function fetch_rooted(trad, stemma, sigil) {
    service
      .reorientStemmaTree(trad.id, stemma.identifier, sigil)
      .then((resp) => {
        stemma.dot = resp.dot;
        render_stemma(graphvizRoot(), trad, stemma);
      })
      .catch((error) => {
        // TODO: some generic error handling?
        console.log(error);
      });
  }

  /**
   * Renders the supplied `stemma` as a graph.
   *
   * @param {Graphviz} graph_root
   * @param {Tradition} tradition
   * @param {Stemma} stemma
   */
  function render_stemma(graph_root, tradition, stemma) {
    graph_root.renderDot(ellipse_border_to_none(stemma.dot));
    d3.select('g#graph0')
      .selectAll('.node')
      .on('click', function (e, d) {
        fetch_rooted(tradition, stemma, d.key);
        render_stemma(graph_root, tradition, stemma);
      });
    set_downloads(stemma.dot);
  }

  /**
   * Renders the supplied `tradition` object as a graph in the center of the
   * dashboard.
   *
   * @param {Tradition} tradition
   * @param {Stemma[]} stemmata
   * @param {Stemma | null} selectedStemma
   */
  function render_tradition(tradition, stemmata, selectedStemma) {
    // console.log( data );
    const graph_area = d3.select('#graph_area');
    // After getting the stemmata data we subdue the graph area,
    // so we can paint on it unseen and then fade it in
    graph_area.style('opacity', '0.0');
    graph_area.select('*').remove();
    const graphDiv = graphvizRoot();
    // Here we put in the slide indicators that will allow the user to
    // switch to different stemmata.
    const stemma_selector = d3.select('#stemma_selector');
    stemma_selector.selectAll('*').remove();
    stemma_selector
      .selectAll('span')
      .data(stemmata)
      .enter()
      .append('span')
      .html((d, i) => {
        const selectedIndex = STEMMA_STORE.selectedIndex;
        const isSelected =
          (selectedIndex === -1 && i === 0) || selectedIndex === i;
        const svg = isSelected
          ? svg_slide_indicator_active
          : svg_slide_indicator;
        return `<div data-index="${i}">${svg}</div>`;
      })
      .on('click', function (e, d) {
        // Add EventListeners to slide indicators that will update the
        // indicators and render the newly chosen stemma.
        d3.selectAll('#stemma_selector span svg').style(
          'fill',
          'rgb(255,255,255)'
        );
        d3.select(this).select('svg').style('fill', 'rgb(180,180,180)');
        graph_area.style('opacity', '0.0');

        // Update the state with the selected stemma
        STEMMA_STORE.setSelectedStemma(d);
      });
    // The work horse, graphviz puts in the first stemma here,
    // and we have some mild transitions for posh fade in.
    graphDiv
      // NB Failed approach notice…
      // This causes a slower transition, but the graph still 'drops in'.
      // It just slows *all* transitions. I wish I knew why the butt ugly
      // 'drop in' has been selected as the default undefaultable transition.
      // .transition( function(){ return mellow_transition( d3.transition() ) } )
      .on('renderEnd', function () {
        graph_area.transition().call(mellow_transition).style('opacity', '1.0');
      })
      // Render the stemma (also set button values and update metadata)
      .on('initEnd', function () {
        if (stemmata.length > 0) {
          render_stemma(graphDiv, tradition, selectedStemma || stemmata[0]);
        }
      });
    const buttons = d3.select('#stemma_buttons');
    if (buttons.classed('invisible')) {
      buttons.call(quick_fade_in).classed('invisible', false);
    }
  }

  function selectTradition( evt ) {
    evt.preventDefault();
    const selectedTradition = d3.select(this).datum();
    // This will trigger `onTraditionStateChanged`
    // in which we handle the rendering of the selected tradition.
    TRADITION_STORE.setSelectedTradition(selectedTradition);
  }

  function set_downloads(dot) {
    d3.select('#download_dot').on('click', function (evt) {
      evt.preventDefault();
      download('stemma.dot', dot, 'text/plain');
    }); 
    d3.select('#download_svg').on('click', function (evt) {
      evt.preventDefault();
      download(
        'stemma.svg',
        d3.select('#graph_area div').html(),
        'image/svg+xml'
      );
    });
    d3.select('#download_png').on('click', function (evt) {
      evt.preventDefault();
      saveSvgAsPng(
        d3.select('#graph_area div').select('svg').node(),
        'stemma.png'
      );
    });
  }

  function download(filename, data, mime_type) {
    const blob = new Blob([data], { type: mime_type });
    if (window.navigator.msSaveOrOpenBlob) {
      window.navigator.msSaveBlob(blob, filename);
    } else {
      const elem = document.createElement('a');
      elem.href = URL.createObjectURL(blob);
      elem.download = filename;
      document.body.appendChild(elem);
      elem.click();
      document.body.removeChild(elem);
    }
  }

  /**
   * This function will be called each time the state persisted in the
   * `TRADITION_STORE` changes. It will update the UI to reflect the current
   * state.
   *
   * @param {TraditionState} state
   */
  function onTraditionStateChanged(state) {
    const { availableTraditions, selectedTradition } = state;
    // render the tradition list
    renderTraditionList(availableTraditions);
    // render the current tradition if it is not null
    if (selectedTradition) {
      render_tradition(selectedTradition, [], null);
    } else {
      // otherwise, remove the current tradition from the UI
      TraditionView.clearTradition();
    }
  }

  /**
   * This function will be called each time the state persisted in the
   * `STEMMA_STORE` changes. It will update the UI to reflect the current
   * state.
   *
   * @param {StemmaState} state
   */
  function onStemmaStateChanged(state) {
    const { parentTradition, availableStemmata, selectedStemma } = state;
    if (parentTradition) {
      render_tradition(parentTradition, availableStemmata, selectedStemma);
    }
  }

  // 'Main'
  TRADITION_STORE.subscribe(onTraditionStateChanged);
  STEMMA_STORE.subscribe(onStemmaStateChanged);
  feather.replace({ 'aria-hidden': 'true' });
}
