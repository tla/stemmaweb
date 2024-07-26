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
     
    //TODO (PRIO): the toggles shouldn't fire if that view is already active!
     
    document.querySelector( '#view-stemmata-button' ).addEventListener( 'click', ( evt ) => {
      this.toggleViewButton( evt );
      this.toggleDisplayRelationMapper();
    } );
    document.querySelector( '#delete-tradition-button' ).addEventListener( 'click', this.handleDelete );
    document.querySelector( '#run-stemweb-button' ).addEventListener( 'click', stemwebFrontend.showDialog );
    document.querySelector( '#edit-collation-button' ).addEventListener( 'click', ( evt ) => {
      this.toggleViewButton( evt );
      this.toggleDisplayRelationMapper();
    } );
    fadeIn( this );
  }

  toggleViewButton( evt ) {
    document.querySelectorAll( '#view-selectors button' ).forEach( ( elem ) => {
      elem == evt.currentTarget ? elem.classList.add( 'selected-view' ) : elem.classList.remove( 'selected-view' );
    } );
  }

  
  toggleDisplayRelationMapper() {
    const relationMapperElement = document.querySelector( 'relation-mapper' );
    const stemmaEditorGraphContainerElement = document.querySelector( '#stemma-editor-graph-container' );
    if ( window.getComputedStyle( document.querySelector( 'relation-mapper' ) ).display == "none" ) {
      crossFade( relationMapperElement, stemmaEditorGraphContainerElement );
      const section = SECTION_STORE.state.selectedSection;
      if( section ) {
        stemmaButtonsService.getSectionDot( TRADITION_STORE.state.selectedTradition.id, section.id ).then((resp) => {
          if ( resp.success ) {
            relationRenderer.renderRelationsGraph( resp.data ) ;
          } else {
            StemmawebAlert.show(
              `Could not fetch section graph information: ${resp.message}`,
              'danger'
            );
          }
        } );
      }
    } else {
      crossFade( stemmaEditorGraphContainerElement, relationMapperElement ); 
    }
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
        <button type="button" class="btn btn-sm btn-outline-secondary">
          Examine Stemma
        </button>
        <button id="edit-collation-button" type="button" class="btn btn-sm btn-outline-secondary">
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
