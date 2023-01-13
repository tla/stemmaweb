/**
 * @typedef {import('@types/stemmaweb').TraditionState} TraditionState
 *
 * @typedef {import('@types/stemmaweb').Tradition} Tradition
 */

/** @type {import('d3')} */
const d3 = window.d3;

/** @type {import('feather-icons')} */
const feather = window.feather;

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

function initStemmaweb() {
  const first_char_is_non_alpha = new RegExp('^[^A-z]');

  function $(query, all = false) {
    if (first_char_is_non_alpha.test(query)) {
      if (all) {
        return document.querySelectorAll(query);
      } else {
        return document.querySelectorAll(query);
      }
    } else {
      return document.getElementById(query);
    }
  }

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

  function ellipse_border_to_none(dot) {
    return dot.replace(
      '" {',
      '" {\n\t node [color=none style=filled fillcolor=white]'
    );
  }

  /**
   * Renders the supplied `traditions` array as a list with clickable items.
   *
   * @param traditions {Tradition[]}
   */
  function render_tradition_list(traditions) {
    // Clear the list
    document.getElementById('traditions_list').innerHTML = '';
    let traditions_list = d3
      .select('#traditions_list')
      .selectAll('li')
      .data(traditions, (d) => d.id);
    traditions_list.exit().remove();
    traditions_list = traditions_list
      .enter()
      .append('li')
      .merge(traditions_list);
    traditions_list.classed('nav-item', true);
    const links = traditions_list
      .append('a')
      .classed('nav-link', true)
      .attr('trad-id', (d) => d.id)
      .attr('href', function (d) {
        return 'api/tradition/' + d.id;
      });
    links.html(feather.icons['file-text'].toSvg());
    links.append('span').text((d) => d.name);
    links.on('click', select_tradition);
  }

  function fetch_rooted(trad, stemma, sigil) {
    service
      .reorientStemmaTree(trad.id, stemma.identifier, sigil)
      .then((resp) => {
        stemma.dot = resp.dot;
        render_stemma(trad, stemma);
      })
      .catch((error) => {
        // TODO: some generic error handling?
        console.log(error);
      });
  }

  function update_meta(d, stemma_name) {
    let access_state = 'public';
    if (d.is_public == 'false') {
      access_state = 'private';
    }
    let meta = [
      ['Tradition', d.id],
      ['Stemma', stemma_name],
      ['Owner', d.owner],
      ['Access', access_state],
      ['Language', d.language],
      ['Witnesses', d.witnesses]
    ];
    var rows = d3
      .select('#tradition_info')
      .selectAll('tr')
      .data(meta)
      .join('tr')
      .selectAll('td')
      .data(function (row) {
        return row;
      })
      .join('td')
      .text((d) => d);
  }

  function render_stemma(graph_root, trad, stemma) {
    graph_root.renderDot(ellipse_border_to_none(stemma.dot));
    d3.select('g#graph0')
      .selectAll('.node')
      .on('click', function (evt) {
        fetch_rooted(trad, stemma, d3.select(this).datum().key);
        render_stemma(trad, stemma);
      });
    set_downloads(stemma.dot);
    update_meta(trad, stemma.identifier);
  }

  /**
   * Renders the supplied `tradition` object as a graph in the center of the
   * dashboard.
   *
   * @param {Tradition} trad
   */
  function render_tradition(trad) {
    service
      .listStemmata(trad.id)
      .then((data) => {
        // console.log( data );
        var graph_area = d3.select('#graph_area');
        // After getting the stemmata data we subdue the graph area
        // so we can paint on it unseen and then fade it in
        graph_area.style('opacity', '0.0');
        graph_area.select('*').remove();
        var graph_div = graph_area.append('div');
        graph_div.style('height', '100%');
        // Here we put in the slide indicators that will allow the user to
        // switch to different stemmata.
        var stemma_selector = d3.select('#stemma_selector');
        stemma_selector.selectAll('*').remove();
        stemma_selector
          .selectAll('span')
          .data(data)
          .enter()
          .append('span')
          .html(function (d, i) {
            var svg = svg_slide_indicator;
            if (i == 0) {
              svg = svg_slide_indicator_active;
            }
            return svg;
          })
          .on('click', function (evt) {
            // Add eventlisteners to slide indicators that will update the
            // indicators and render the newly chosen stemma.
            d3.selectAll('#stemma_selector span svg').style(
              'fill',
              'rgb(255,255,255)'
            );
            d3.select(this).select('svg').style('fill', 'rgb(180,180,180)');
            var datum = d3.select(this).datum();
            graph_area.style('opacity', '0.0');
            render_stemma(graph_div, trad, datum);
          });
        // The work horse, graphviz puts in the first stemma here,
        // and we have some mild transitions for posh fade in.
        graph_div = graph_div
          .graphviz()
          .width(graph_div.node().getBoundingClientRect().width)
          .height(graph_div.node().getBoundingClientRect().height)
          .fit(true)
          // NB Failed approach notice…
          // This causes a slower transition, but the graph still 'drops in'.
          // It just slows *all* transitions. I wish I knew why the butt ugly
          // 'drop in' has been selected as the default undefaultable transition.
          // .transition( function(){ return mellow_transition( d3.transition() ) } )
          .on('renderEnd', function () {
            graph_area
              .transition()
              .call(mellow_transition)
              .style('opacity', '1.0');
          })
          // Render the stemma (also set button values and update metadata)
          .on('initEnd', function () {
            render_stemma(graph_div, trad, data[0]);
          });
      })
      .then(function () {
        // After we have started the rendering of the stemma
        // we fade in the title of the tradition
        // and the buttons for download etc.
        d3.select('#tradition_name').call(quick_fade_in).text(trad.name);
        var buttons = d3.select('#stemma_buttons');
        if (buttons.classed('invisible')) {
          buttons.call(quick_fade_in).classed('invisible', false);
        }
      });
  }

  function select_tradition(evt) {
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

  function getStyleSheet(name) {
    for (const sheet of document.styleSheets) {
      if (sheet.href && sheet.href.split('.css')[0].endsWith(name)) {
        return sheet;
      }
    }
  }

  function show_new_tradition_partial() {
    $('add_tradition_modal_addition_type_choice').classList.add('hide');
    $('texttradition_literal').innerText = 'text / tradition';
    $('tradition_literal').innerText = 'tradition';
    $('add_tradition_partial').classList.remove('hide');
    $('new_tradition_partial').classList.remove('hide');
  }

  function show_new_section_partial() {
    $('add_tradition_modal_addition_type_choice').classList.add('hide');
    $('texttradition_literal').innerText = 'section';
    $('tradition_literal').innerText = 'section';
    $('add_tradition_partial').classList.remove('hide');
    $('new_section_partial').classList.remove('hide');
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
    render_tradition_list(availableTraditions);
    // render the current tradition if it is not null
    if (selectedTradition) {
      render_tradition(selectedTradition);
    } else {
      // otherwise, remove the current tradition from the UI
      TraditionView.clearTradition();
    }
  }

  // 'Main'
  TRADITION_STORE.subscribe(onTraditionStateChanged);
  feather.replace({ 'aria-hidden': 'true' });

  // Initialize the add_tradition_modal dialog
  const add_tradition_modal_elem = $('add_tradition_modal');
  const add_tradition_modal = new bootstrap.Modal(add_tradition_modal_elem);
  // Make sure the right partial of the form is shown when section or tradition is chosen
  const button_new_tradition = $('button_new_tradition');
  button_new_tradition.addEventListener('click', show_new_tradition_partial);
  const button_new_section = $('button_new_section');
  button_new_section.addEventListener('click', show_new_section_partial);
  // Make sure, on cancel the form is returned to pristine state
  add_tradition_modal_elem.addEventListener('transitionend', function (evt) {
    if (
      evt.target == add_tradition_modal_elem &&
      !add_tradition_modal_elem.classList.contains('show')
    ) {
      [
        'add_tradition_partial',
        'new_tradition_partial',
        'new_section_partial'
      ].forEach(function (elem) {
        $(elem).classList.add('hide');
      });
      $('add_tradition_modal_addition_type_choice').classList.remove('hide');
      $('add_tradition_form').classList.remove('was-validated');
    }
  });

  // This ensures the add_tradition_modal is placed nicely flush right of the menubar.
  // TODO: Add responsiveness on resize.
  const dashboard_stemmaweb_css = getStyleSheet('dashboard-stemmaweb');
  let add_tradition_modal_marginleft = window
    .getComputedStyle($('sidebarMenu'))
    .getPropertyValue('width');
  dashboard_stemmaweb_css.insertRule(
    '#add_tradition_modal.modal.fade div.modal-dialog { margin-left: ' +
      add_tradition_modal_marginleft +
      '; margin-top: 50px; transform: none; }'
  );

  // JavaScript for disabling form submissions if there are invalid fields
  // Fetch all the forms we want to apply custom Bootstrap validation styles to
  var forms = document.querySelectorAll('.needs-validation');
  // Loop over them and prevent submission
  Array.prototype.slice.call(forms).forEach(function (form) {
    form.addEventListener(
      'submit',
      function (evt) {
        evt.preventDefault();
        evt.stopPropagation();
        if (form.checkValidity()) {
          var form_data = new FormData(form);
          // Note that to inspect FormData you have to explode it
          // console.log( ...form_data )
          form_data.append('file', $('uploadfile').files[0]);
          fetch('newtradition/', {
            method: 'POST',
            body: form_data
          })
            .then((response) => console.log(response))
            .then((success) => console.log(success))
            .catch(
              // TODO: some generic error handling
              (error) => console.log(error)
            );
        }
        form.classList.add('was-validated');
      },
      false
    );
  });
}
