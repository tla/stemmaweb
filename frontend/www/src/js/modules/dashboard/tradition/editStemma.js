/** @typedef {import('@types/stemmaweb').BaseResponse} BaseResponse */

/**
 * Object to interact with the Stemmarest Middleware's API through high-level
 * functions.
 *
 * @type {StemmarestService}
 */
const editStemmaService = stemmarestService;

class EditStemma extends HTMLElement {
  constructor() {
    super();
    this.addEventListener( 'click', this.handleLeaveEditor );
  }

  connectedCallback() {
    const stemmaEditorContainerElement = document.querySelector( '#stemma-editor-container' );
    const stemmaDotEditorTextarea = document.querySelector( '#stemma-dot-editor' );

    // Attach a listener to know when we might need to re-render the stemma.
    stemmaDotEditorTextarea.addEventListener( 'keyup', (evt) => {
      const editor_dot = stemmaDotEditorTextarea.value
      try {
        var ast = dotParser.parse( editor_dot );
        // If no error we start to re-render
        // unless last re-render is active or only very shortly finished (TODO: How?)
        stemmaRenderer.render_stemma( stemmaRenderer.ellipse_border_to_none( editor_dot ) );
      } catch( { name, message } ) {
        // console.log( name, message );
        // Nothing happens when we do not have a well formed dot string.
      }
    });

    // Attach a listener for when the editor slides open or close, after
    // which we set the dot editor value. (Otherwise we get weird 'moving'
    // dot text when the textarea expands.)
    stemmaEditorContainerElement.addEventListener( 'transitionend', (evt) => {
      // Possibly multiple transition may be happening.
      if( evt.propertyName == 'opacity' ) {
        // Also we need to distinguish between opening and closing the editor.
        if( stemmaEditorContainerElement.classList.contains( 'expanded' ) ) {
          const stemma = STEMMA_STORE.state.selectedStemma || { dot: '' }
          stemmaDotEditorTextarea.value = stemma.dot;
          // Attach a listener to handle stuff happening outside the textarea of the editor.
          // E.g. asking if we should save when clicking non editor functions.
          document.querySelector( '#stemma-editor-graph-container-modal-backdrop' ).addEventListener( 'click', (evt) => { this.handleLeaveEditor( evt ) } );
        } else {
          stemmaDotEditorTextarea.value = '';
          document.querySelector( '#stemma-editor-graph-container-modal-backdrop' ).remove();
        }
      };
    })
    this.render();
  }

  toggleStemmaEditor() {
    const stemmaEditorContainerElement = document.querySelector( '#stemma-editor-container' );
    const stemmaSelectorContainerElement = document.querySelector( '#stemma-selector-container')
    stemmaEditorContainerElement.classList.toggle( 'expanded' );
    stemmaSelectorContainerElement.classList.toggle( 'show' )
    if( stemmaEditorContainerElement.classList.contains( 'expanded' ) ){
      // Here we append an almost invisible backdrop to the document. Its z-index is large and
      // only the z-index of the editor and graph panel is larger. However, both have a lower
      // z-index than Bootstrap's modal. This will allow us to detect when the user clicks 
      // functions outside of the editor and graph panel and first ask if we should save stuff
      // using Bootstraps modal.
      const stemmaEditorModalBackdrop = document.createElement( 'div' );
      stemmaEditorModalBackdrop.setAttribute( 'id', 'stemma-editor-graph-container-modal-backdrop' );
      document.body.appendChild( stemmaEditorModalBackdrop );
      // <div id="stemma-editor-graph-container-modal-backdrop"></div>
      // const stemmaEditorModalBackdrop = document.querySelector( '#stemma-editor-graph-container-modal-backdrop' );
    }
    const graphContainerElement = document.querySelector( '#graph_container' );
    graphContainerElement.classList.toggle( 'shrunken' );
  }

  handleLeaveEditor( evt ) {
    const stemmaDotEditorTextarea = document.querySelector( '#stemma-dot-editor' );
    const stemmaEditorContainerElement = document.querySelector( '#stemma-editor-container' );
    // TODO: Prevent saving/leaving if dot doesn't parse.
    if( evt.target != stemmaDotEditorTextarea ){
      if( stemmaEditorContainerElement.classList.contains( 'expanded' ) ){
        StemmawebDialog.show(
          'Close stemma editor?',
          '<p>This action will close the stemma editor. However, you have unsaved changes. Should these changes be saved?</p>',
          {
            onOk: () => { 
              // Save stemma
              console.log( 'OK pressed' );
              try {
                const editor_dot = stemmaDotEditorTextarea.value;
                var ast = dotParser.parse( editor_dot );
                // If no error we can try to save the stemma.
                const userId = AUTH_STORE.state.user ? AUTH_STORE.state.user.id : null;
                const tradId = TRADITION_STORE.state.selectedTradition.id;
                const stemma_name = STEMMA_STORE.state.selectedStemma.identifier;
                const stemma_dot = stemmaDotEditorTextarea.value;
                return( editStemmaService.saveStemma( userId, tradId, stemma_name, stemma_dot ).then( (resp) => { return this.handleSaveStemma( resp ) } ) );
              } catch( { name, message } ) {
                StemmawebAlert.show(`Cannot save stemma: ${name} - ${message}`, 'danger');
                return Promise.resolve({
                  success: false,
                  message: message
                });
              }
            },
            onAlt: () => { 
              // reset the stemma rendered to the stemma in current state
              const dot = STEMMA_STORE.state.selectedStemma.dot;
              stemmaRenderer.render_stemma( stemmaRenderer.ellipse_border_to_none( dot ) );
              this.toggleStemmaEditor();
            }
          },
          {
            okLabel: 'Save and close',
            okType: 'success',
            altLabel: 'Ignore and close',
            altType: 'warning',
            closeLabel: 'Cancel',
            closeType: 'secondary'
          }
        );
      } else {
        this.toggleStemmaEditor();
      }
    }
  }

  /** @param {BaseResponse<T>} resp */
  handleSaveStemma( resp ) {
    if (resp.success) {
      StemmawebAlert.show( 'Stemma saved.', 'success' );
      // Todo: what do we need to update and repaint?
      // TRADITION_STORE.updateTradition(resp.data);
      this.toggleStemmaEditor();
      return Promise.resolve({
        success: true,
        message: 'Stemma saved.'
      });
    } else {
      StemmawebAlert.show(`Error: ${resp.message}`, 'danger');
      return Promise.resolve({
        success: false,
        message: resp.message
      });
    }
  }
  
  render() {
    this.innerHTML = `
            <a
            class="link-secondary"
            href="#"
            aria-label="Edit this stemma">
                <div class="has-pop-caption">
                  ${feather.icons['edit'].toSvg()}
                </div>
            </a>
        `;
  }
}

customElements.define('edit-stemma-button', EditStemma);
