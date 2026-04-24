/**
 * Object to interact with the Stemmarest Middleware's API through high-level
 * functions.
 *
 * @type {StemmarestService}
 */
const stemmaButtonsService = stemmarestService;

class StemmaButtons extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
    /** 
     *  // TODO: Once button "Examine stemma" is added we need to refactor the 
     *  this.toggle-s out in a single function that checks which view
     *  needs to be shown and what button needs to be highlighted and
     *  un-highligthed.
     */

    document.querySelector('#view-stemmata-button').addEventListener('click', this.setView);
    document.querySelector('#run-stemweb-button').addEventListener('click', stemwebFrontend.showDialog);
    // We want this in the below call to be this class, hence the `.call`, otherwise it will be the button element clicked.
    document.querySelector('#edit-collation-button').addEventListener('click', (event) => { this.setView.call(this, event) });
    document.querySelector('#delete-tradition-button').addEventListener('click', this.handleDelete);

    this.setTraditionDownloadListeners();

    AUTH_STORE.subscribe( ( state ) => { this.greyOut(); } )
    TRADITION_STORE.subscribe( (state) => { this.greyOut(); } );
    fadeIn(this);
  }

  setTraditionDownloadListeners() {
    const formats_mimeTypes = {
      'json': { 
        'ext': 'json', 
        'mimeType': 'application/json'
      },
      'csv': { 
        'ext': 'csv', 
        'mimeType': 'text/csv'
      },
      'tsv': {
        'ext': 'tsv',
        'mimeType': 'text/tab-separated-values'
      },
      'matrix': {
        'ext': 'txt',
        'mimeType': 'text/plain'
      },
      'dot': {
        'ext': 'dot',
        'mimeType': 'text/plain'
      },
      'svg':  {
        'ext': 'svg',
        'mimeType': 'image/svg+xml'
      },
      // GraphML not supported yet.
      // 'graphml': {
      //   'ext': 'zip',
      //   'mimeType': 'application/zip'
      // }
    };
    for ( const[ format, ext_mimeType ] of Object.entries( formats_mimeTypes ) ) {
      d3.select( `#download_trad_${format}` ).on( 'click', function (evt) {
        evt.preventDefault();
        const tradition = TRADITION_STORE.state.selectedTradition ? TRADITION_STORE.state.selectedTradition : null
        if( tradition ) {
          const traditionFilename = `${libraries.lib_SanitizeFilename.sanitize( tradition.name )}.${ext_mimeType['ext']}`;
          stemmarestService.getTraditionDownload( tradition.id, format ).then( (res) => {
              if (res.success) {
                let downloadData = res.data;
                if ( format=='json' ) {
                    downloadData = JSON.stringify( downloadData );
                }
                Download.download( traditionFilename, downloadData, ext_mimeType['mimeType'] );
              } else {
                StemmawebAlert.show(
                  `Error retrieving tradition data: ${res.message}`,
                  'danger'
                );
              }
          } );
        }   
      } );
    }
  }

  /**
   * This should take care of correctly greying out buttons of this
   * component when a user logs in or out.
   */
  greyOut() {
    const buttonIds = ['run-stemweb-button', 'delete-tradition-button'];
    buttonIds.forEach((buttonId) => {
      document.querySelector(`#${buttonId}`).classList.remove('disabled');
      if (!userIsOwner()) {
        document.querySelector(`#${buttonId}`).classList.add('disabled');
      }
    });
    const editCollationButton = document.querySelector(`#edit-collation-button`);
    editCollationButton.classList.remove( 'disabled' );
    const VIEW_COLLATION = 'View Collation';
    const EDIT_COLLATION = 'Edit Collation';
    let editCollationButtonText = VIEW_COLLATION;
    if ( userIsOwner() ) {
      editCollationButtonText = EDIT_COLLATION;
    }
    editCollationButton.innerHTML = editCollationButtonText;
  }

  setView(evt) {
    const currentView = document.querySelector('#view-selectors .selected-view ');
    var targetView = null;
    var fadeOutElement = null;
    if (!(evt.currentTarget == currentView)) {
      // Set the right button to highlight.
      currentView.classList.remove('selected-view');
      evt.currentTarget.classList.add('selected-view');
      // Figure out the chosen view (targetView) and do what needs to happen to prepare it.
      if (evt.currentTarget == document.querySelector('#view-stemmata-button')) {
        targetView = document.querySelector('#stemma-editor-graph-container');
      }
      if (evt.currentTarget == document.querySelector('#edit-collation-button')) {
        targetView = document.querySelector('relation-mapper');
        var section = SECTION_STORE.state.selectedSection;
        const traditionId = TRADITION_STORE.state.selectedTradition.id;
        // In the case no section was selected by the user, we select the first section of the current tradition.
        if (!section) {
          section = document.querySelector( `section-list[trad-id="${traditionId}"]` ).getFirstSection();
          SECTION_STORE.setSelectedSection( section ).then(
            this.getSectionDot( traditionId, section.id ).then( (resp) => {
              this.switchToRelationMapper( resp, section.id );
            } )
          );
        } else {
          this.getSectionDot( traditionId, section.id ).then( (resp) => 
            this.switchToRelationMapper(resp, section.id)
          );
        }
      }
      // Figure out which view we are closing, set that as element to 
      // fade out, and remove or stash stuff from the view we are closing.
      if (currentView == document.querySelector('#edit-collation-button')) {
        document.querySelector('#section-title').innerHTML = '';
        fadeOutElement = document.querySelector('relation-mapper');
        document.querySelector('#main').classList.remove('col-9');
        document.querySelector('#main').classList.add('col-7');
        document.querySelector('relation-types').unrender();
        document.querySelector('node-density-chart').hide();
        document.querySelector('reading-properties-view').hide();
        document.querySelector('property-table-view').show();
        document.querySelector('section-properties-view').show();
        fadeToDisplayNone('#sidebar-menu', { 'reverse': true, 'delay': 500 });
        crossFade(targetView, fadeOutElement);
      }
    }
  }

  getSectionDot(traditionId, sectionId) {
    return stemmaButtonsService.getSectionDot( traditionId, sectionId );
  }

  switchToRelationMapper(resp, sectionId) {
    if (resp.success) {
      SectionSelectors.renderSectionSelectors();
      this.closeStemmaView(
        { 'onEnd': () => { this.openRelationView(resp, sectionId) } }
      );
    } else {
      StemmawebAlert.show(
        `Could not fetch section graph information: ${resp.message}`,
        'danger'
      );
    }
  }

  closeStemmaView(options) {
    const defaultOptions = {
      'onEnd': () => { }
    };
    const usedOptions = { ...defaultOptions, ...options };
    const fadeOutElement = document.querySelector('#stemma-editor-graph-container');
    fadeToDisplayNone('#sidebar-menu', { 'delay': 0 });
    document.querySelector('#main').classList.remove('col-7');
    document.querySelector('#main').classList.add('col-9'); // Timed in CSS to 1s with 500ms delay, hence duration of 1500 in next line.
    fadeToDisplayNone(fadeOutElement, {
      'duration': 1500,
      'onEnd': () => {
        usedOptions.onEnd();
      }
    });
  }

  openRelationView(resp, sectionId) {
    // TODO: There is a enormous overlap between this code and
    // code doing practically the same thing in `sectionSelectors.js`
    // Both should probably call some extracted.
    relationRenderer.renderRelationsGraph(
      resp.data, {
      'onEnd': () => {
        this.setSectionTitle();
        this.addInRelations(sectionId);
        this.addInReadingInformation(sectionId);
        this.renderDensityChart();
        document.querySelector('reading-properties-view').show();
        this.hideIrrelevantPropertyViews();
        const relationMapperElement = document.querySelector('relation-mapper');
        fadeToDisplayFlex(relationMapperElement, { 'duration': 1500 });
      }
    }
    );
  }

  addInRelations(sectionId) {
    stemmaButtonsService.getSectionRelations(TRADITION_STORE.state.selectedTradition.id, sectionId).then((resp) => {
      if (resp.success) {
        document.querySelector('relation-types').renderRelationTypes(
          { 'onEnd': () => { fadeToDisplayNone(document.querySelector('relation-types div'), { 'reverse': true }) } }
        );
        RelationMapper.addRelations(resp.data);
      } else {
        StemmawebAlert.show(
          `Could not fetch relations information: ${resp.message}`,
          'danger'
        );
      }
    });
  }

  setSectionTitle() {
    document.querySelector('#section-title').innerHTML = `${SECTION_STORE.state.selectedSection.name}`;
  }

  addInReadingInformation(sectionId) {
    stemmaButtonsService.getSectionReadings(TRADITION_STORE.state.selectedTradition.id, sectionId).then((resp) => {
      if (resp.success) {
        RelationMapper.addReadings(resp.data);
      } else {
        StemmawebAlert.show(
          `Could not fetch reading information: ${resp.message}`,
          'danger'
        );
      }
    });
  }

  renderDensityChart() {
    document.querySelector('node-density-chart').renderChart(
      {
        'onEnd': () => {
          fadeToDisplayNone(document.querySelector('node-density-chart div'), { 'reverse': true });
        }
      }
    );
  }

  hideIrrelevantPropertyViews() {
    document.querySelector('property-table-view').hide();
    document.querySelector('section-properties-view').hide();
  }

  handleDelete() {
    const { selectedTradition: tradition, availableTraditions } =
      TRADITION_STORE.state;
    StemmawebDialog.show(
      'Delete Tradition',
      `<p>Are you sure you want to delete <span class="fst-italic">${tradition.name}</span>?</p>`,
      {
        onOk: () => {
          stemmaButtonsService.deleteTradition(tradition.id).then((res) => {
            if (res.success) {
              StemmawebAlert.show(
                `<p class="d-inline">Deleted <span class="fst-italic">${tradition.name}</span></p>`,
                'success'
              );
              // Update client-side state
              const traditionsWithoutDeleted = availableTraditions.filter(
                (t) => t.id !== tradition.id
              );
              TRADITION_STORE.setState({
                availableTraditions: traditionsWithoutDeleted,
                selectedTradition: traditionsWithoutDeleted[0] || null
              });
            } else {
              StemmawebAlert.show(
                `Error during deletion: ${res.message}`,
                'danger'
              );
            }
          });
        }
      },
      {
        okLabel: 'Yes, delete it',
        okType: 'danger',
        closeLabel: 'Cancel',
        closeType: 'secondary'
      }
    );
  }

  render() {
    this.innerHTML = `
    <div id="stemma-buttons" class="btn-toolbar mb-2 mb-md-0">
      <div id="view-selectors" class="btn-group me-2">
        <button id="view-stemmata-button" type="button" class="btn btn-sm btn-outline-secondary selected-view">
          View stemmata
        </button>
        <button id="run-stemweb-button" type="button" class="btn btn-sm btn-outline-secondary disabled">
          Run Stemweb
        </button>
        <button type="button" class="btn btn-sm btn-outline-secondary disabled">
          Examine Stemma
        </button>
        <button id="edit-collation-button" type="button" class="btn btn-sm btn-outline-secondary disabled">
          Edit Collation
        </button>
      </div>
      <div class="btn-group me-2">
        <button id="tradition-download-button" type="button" class="btn btn-sm btn-outline-secondary" data-bs-toggle="dropdown">
          <span data-feather="download"></span>
          Tradition
        </button>
        <div
          class="dropdown-menu"
          aria-labelledby="tradition_downloadbtn"
        > 
          <a class="dropdown-item" id="download_trad_json" href="#">JSON table (collation only)</a>
          <a class="dropdown-item" id="download_trad_csv" href="#">Comma-separated values (collation only)</a>
          <a class="dropdown-item" id="download_trad_tsv" href="#">Tab-separated values (collation only)</a>
          <a class="dropdown-item" id="download_trad_matrix" href="#">Phylip character matrix (collation only)</a>
          <a class="dropdown-item" id="download_trad_dot" href="#">Graphviz dot format (collation and relationships)</a>
          <a class="dropdown-item" id="download_trad_svg" href="#">SVG graph display (collation and relationships)</a>
          <a class="dropdown-item" id="download_trad_graphml" href="#">Native GraphML ZIP format</a>
        </div>
      </div>
      <div class="dropdown">
        <button
          type="button"
          class="btn btn-sm btn-outline-secondary dropdown-toggle"
          id="stemma_image_downloadbtn"
          data-bs-toggle="dropdown"
        >
          <span data-feather="download"></span>
          Stemma
        </button>
        <div
          class="dropdown-menu"
          aria-labelledby="stemma_image_downloadbtn"
        >
          <a class="dropdown-item" id="download_svg" href="#">.svg</a>
          <a class="dropdown-item" id="download_png" href="#">.png</a>
          <a class="dropdown-item" id="download_dot" href="#">.dot</a>
        </div>
      </div>
      <div class="btn-group ms-2">
        <button id="delete-tradition-button" type="button" class="btn btn-sm btn-outline-danger disabled">
          <span data-feather="trash"></span>
          Delete
        </button>
      </div>
    </>
    `;
  }
}

customElements.define('stemma-buttons', StemmaButtons);
