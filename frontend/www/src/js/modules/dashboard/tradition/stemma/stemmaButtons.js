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
    
    document.querySelector( '#view-stemmata-button' ).addEventListener( 'click', this.setView );
    document.querySelector( '#run-stemweb-button' ).addEventListener( 'click', stemwebFrontend.showDialog );
    document.querySelector( '#edit-collation-button' ).addEventListener( 'click', this.setView );
    document.querySelector( '#delete-tradition-button' ).addEventListener( 'click', this.handleDelete );

    SECTION_STORE.subscribe( this.toggleEditCollationButtonActive );

    fadeIn( this );
  }

  /** 
   * This takes care of the edit collation button to be greyed out
   * if there is no section selected.
   */
  toggleEditCollationButtonActive() {
    const editCollationButtonElement = document.querySelector( '#edit-collation-button' );
    if( SECTION_STORE.state.selectedSection ) {
      if ( editCollationButtonElement.classList.contains( 'disabled' ) ) {
        editCollationButtonElement.classList.remove( 'disabled' );
      }
    } else {
      if ( !editCollationButtonElement.classList.contains( 'disabled' ) ) {
        editCollationButtonElement.classList.add( 'disabled' );
      }
    }
  }

  setView( evt ) {
    const currentView = document.querySelector( '#view-selectors .selected-view ' );
    var targetView = null;
    var fadeOutElement = null;
    if ( !( evt.currentTarget == currentView ) ) {
      // Set the right button to highlight.
      currentView.classList.remove( 'selected-view' );
      evt.currentTarget.classList.add( 'selected-view' );
      // Figure out the chosen view (targetView) and do what needs to happen to prepare it.
      if ( evt.currentTarget == document.querySelector( '#view-stemmata-button' ) ) {
        targetView = document.querySelector( '#stemma-editor-graph-container' );
      }
      if ( evt.currentTarget == document.querySelector( '#edit-collation-button' ) ) {
        targetView = document.querySelector( 'relation-mapper' );     
        var section = SECTION_STORE.state.selectedSection;
        if ( !section ) {
          section = SECTION_STORE.state.availableSections[0];
          SECTION_STORE.setSelectedSection( section );
        }
        if( section ) {
          stemmaButtonsService.getSectionDot( TRADITION_STORE.state.selectedTradition.id, section.id ).then( (resp) => {
            if ( resp.success ) {
              // Because the relation mapper container is `display: none` on initialization we use the height of other elements.
              // Timing is relevant: closeStemmaView takes a callback and when that gets executed the stemma graph container
              // is already `display: none` and `getBoundingClientRect()` return just zero on any dimension.
              const graphRendererHeight = document.querySelector( '#graph-area' ).getBoundingClientRect().height;
              SectionSelectors.renderSectionSelectors();
              StemmaButtons.closeStemmaView( () => {
                const graphRendererWidth = document.querySelector( '#topbar-menu' ).getBoundingClientRect().width;
                // TODO: There is a enormous overlap between this code and
                // code doing practically the same thing in `sectionSelectors.js`
                // Both should probably call some extracted.
                relationRenderer.renderRelationsGraph( 
                  resp.data, {
                    'width': graphRendererWidth,
                    'height': graphRendererHeight,
                    'onEnd': () => { 
                      fadeToDisplayFlex( targetView, { 
                        'duration': 1500,
                        'onEnd': () => {
                          //Add in relations information
                          stemmaButtonsService.getSectionRelations( TRADITION_STORE.state.selectedTradition.id, section.id ).then( (resp) => {
                            if ( resp.success ) {
                              document.querySelector( 'relation-types' ).renderRelationTypes(
                                { 'onEnd': () => { fadeToDisplayNone( document.querySelector( 'relation-types div' ), { 'reverse': true } ) } }
                              );
                              RelationMapper.addRelations( resp.data );
                            } else {
                              StemmawebAlert.show(
                                `Could not fetch relations information: ${resp.message}`,
                                'danger'
                              );                
                            }
                          } );
                        }  
                      } );
                      document.querySelector( '#section-title' ).innerHTML = `${SECTION_STORE.state.selectedSection.name}`;
                      // Add in the reading information
                      stemmaButtonsService.getSectionReadings( TRADITION_STORE.state.selectedTradition.id, section.id ).then( (resp) => {
                        if ( resp.success ) {
                          RelationMapper.addReadings( resp.data );
                        } else {
                          StemmawebAlert.show(
                            `Could not fetch reading information: ${resp.message}`,
                            'danger'
                          );                
                        }
                      } );
                      document.querySelector( 'node-density-chart' ).renderChart(
                        { 'onEnd': () => { 
                            fadeToDisplayNone( document.querySelector( 'node-density-chart div' ), { 
                              'reverse': true,
                              'onEnd': () => { 
                                relationRenderer.resetZoom();
                                debugLog( this, 'relationRenderer.resetZoom() was called.' ) 
                              } 
                            } ) 
                          } 
                        }
                      );         
                      document.querySelector( 'property-table-view' ).hide();      
                      document.querySelector( '#section-properties-view-title' ).classList.toggle( 'hide' );
                      document.querySelector( '#section-reading-properties-tabs' ).classList.toggle( 'hide' );                    
                    }
                  }
                );
              } );
            } else {
              StemmawebAlert.show(
                `Could not fetch section graph information: ${resp.message}`,
                'danger'
              );
            }
          } );
        }     
      }
      // Figure out which view we are closing, set that as element to 
      // fade out, and remove or stash stuff from the view we are closing.
      if ( currentView == document.querySelector( '#edit-collation-button' ) ) {
        relationRenderer.destroy(); // Wondering? See the elaborate note in relationRenderer.js.
        document.querySelector( '#section-title' ).innerHTML = '';
        fadeOutElement = document.querySelector( 'relation-mapper' );
        document.querySelector( '#main' ).classList.remove( 'col-9' );
        document.querySelector( '#main' ).classList.add( 'col-7' );
        document.querySelector( 'relation-types' ).unrender();
        document.querySelector( 'node-density-chart' ).unrender();
        document.querySelector( 'property-table-view' ).show();
        document.querySelector( '#section-properties-view-title' ).classList.toggle( 'hide' );
        document.querySelector( '#section-reading-properties-tabs' ).classList.toggle( 'hide' );                    
        fadeToDisplayNone( '#sidebar-menu', { 'reverse': true, 'delay': 500 } );
        crossFade( targetView, fadeOutElement ); 
      }
    }
  }

  static closeStemmaView( callBack ) {
    const fadeOutElement = document.querySelector( '#stemma-editor-graph-container' );
    fadeToDisplayNone( '#sidebar-menu', { 'delay': 0 } );
    document.querySelector( '#main' ).classList.remove( 'col-7' );
    document.querySelector( '#main' ).classList.add( 'col-9' ); // Timed in CSS to 1s with 500ms delay, hence duration of 1500 in next line.
    fadeToDisplayNone( fadeOutElement, { 'duration': 1500, 'onEnd': callBack } );
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
        <button id="run-stemweb-button" type="button" class="btn btn-sm btn-outline-secondary">
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
        <button type="button" class="btn btn-sm btn-outline-secondary">
          <span data-feather="download"></span>
          Tradition
        </button>
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
        <button id="delete-tradition-button" type="button" class="btn btn-sm btn-outline-danger">
          <span data-feather="trash"></span>
          Delete
        </button>
      </div>
    </>
    `;
  }
}
customElements.define('stemma-buttons', StemmaButtons);
