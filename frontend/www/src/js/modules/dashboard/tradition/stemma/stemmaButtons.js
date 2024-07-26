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
    document.querySelector( '#delete-tradition-button' ).addEventListener( 'click', this.handleDelete );
    document.querySelector( '#run-stemweb-button' ).addEventListener( 'click', stemwebFrontend.showDialog );
    document.querySelector( '#button-edit-collation' ).addEventListener( 'click', this.toggleDisplayRelationMapper );
    fadeIn( this );
  }

  toggleDisplayRelationMapper() {
    const relationMapperElement = document.querySelector( 'relation-mapper' );
    const stemmaEditorGraphContainerElement = document.querySelector( '#stemma-editor-graph-container' );
    if ( window.getComputedStyle( document.querySelector( "relation-mapper" ) ).display == "none" ) {
      crossFade( relationMapperElement, stemmaEditorGraphContainerElement );
      const section = SECTION_STORE.state.selectedSection;
      if( section ) {
        stemmaButtonsService.getSectionDot( TRADITION_STORE.state.selectedTradition.id, section.id ).then((resp) => {
          if ( resp.success ) {
            const relationMapperArea = d3.select('#relation-mapper-div');
            const selection = relationMapperArea.select('#relation-graph');
            console.log( relationMapperArea.node().getBoundingClientRect().width);
            console.log( window.getComputedStyle( relationMapperArea.node() ).width ); 
            console.log( document.querySelector( 'relation-mapper' ).getBoundingClientRect().width );
            console.log( document.querySelector( '#stemma-editor-graph-container' ).getBoundingClientRect().width );
            const graph = selection.empty()
              ? relationMapperArea.append('div').attr('id', 'relation-graph')
              : selection;
            graph.style('height', '400px').style('width','100%');
            const gv = graph
              .graphviz()
              .width(document.querySelector( '#stemma-editor-graph-container' ).getBoundingClientRect().width)
              .height(400);
              // .fit(true);
            gv.renderDot( resp.data ) ;
            console.log( 'done' );
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
      <div class="btn-group me-2">
        <button id="run-stemweb-button" type="button" class="btn btn-sm btn-outline-secondary">
          Run Stemweb
        </button>
        <button type="button" class="btn btn-sm btn-outline-secondary">
          Examine Stemma
        </button>
        <button id="button-edit-collation" type="button" class="btn btn-sm btn-outline-secondary">
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
