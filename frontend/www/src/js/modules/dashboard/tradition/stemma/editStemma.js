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
    this.buttonAction = null;
  }

  connectedCallback() {
    const stemmaEditorContainerElement = document.querySelector( '#stemma-editor-container' );
    const stemmaDotEditorTextarea = document.querySelector( '#stemma-dot-editor' );

    // Attach a listener to know when we might need to re-render the stemma.
    stemmaDotEditorTextarea.addEventListener( 'keyup', (evt) => {
      const editorDot = stemmaDotEditorTextarea.value
      try {
        var ast = dotParser.parse( editorDot );
        // If no error we start to re-render
        // unless last re-render is active or only very shortly finished (TODO: How?)
        const editorStemma = { dot: editorDot }
        const tradition = STEMMA_STORE.state.tradition;
        stemmaRenderer.renderStemma( tradition, editorStemma );
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
    document.querySelector( '#edit-stemma-button-link' ).addEventListener( 'click', (evt) => {
      this.buttonAction = 'edit';
      this.handleLeaveEditor( evt ) 
    });
    document.querySelector( '#add-stemma-button-link' ).addEventListener( 'click', (evt) => { 
      this.buttonAction = 'add';
      this.handleLeaveEditor( evt ) 
    });
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
    if( evt.target != stemmaDotEditorTextarea ){
      if( stemmaEditorContainerElement.classList.contains( 'expanded' ) ){
        StemmawebDialog.show(
          'Close stemma editor?',
          '<p>This action will close the stemma editor. However, you have unsaved changes. Should these changes be saved?</p>',
          {
            onOk: () => { 
              // Save stemma
              try {
                const editor_dot = stemmaDotEditorTextarea.value;
                var ast = dotParser.parse( editor_dot );
                // If no error we can try to save the stemma.
                const userId = AUTH_STORE.state.user ? AUTH_STORE.state.user.id : null;
                const tradId = TRADITION_STORE.state.selectedTradition.id;
                const stemma_dot = stemmaDotEditorTextarea.value;
                var stemma_name = STEMMA_STORE.state.selectedStemma.identifier;
                // Distinguish edit from add stemma, if add do a POST instead of a PUT
                if( this.buttonAction == 'add' ) {
                  stemma_name = ast[0].id;
                  return( editStemmaService.addStemma( userId, tradId, stemma_name, stemma_dot ).then( (resp) => { return this.handleSaveStemma( resp ) } ) );
                } else {
                  return( editStemmaService.saveStemma( userId, tradId, stemma_name, stemma_dot ).then( (resp) => { return this.handleSaveStemma( resp ) } ) );
                }
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
              const { tradition, selectedStemma } = STEMMA_STORE.state;
              stemmaRenderer.renderStemma( tradition, selectedStemma );
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
      const detail = resp.data || '';
      const errorDetail = detail.error || '';
      var message = `${resp.message}`;
      if( errorDetail.length > 0 ){
        message = `${message}; ${errorDetail}`
      }
      StemmawebAlert.show(`Error: ${message}`, 'danger');
      return Promise.resolve({
        success: false,
        message: message
      });
    }
  }
  
  render() {
    this.innerHTML = `
            <a
              id="edit-stemma-button-link"
              class="link-secondary"
              href="#"
              aria-label="Edit this stemma">
                <div>
                  ${feather.icons['edit'].toSvg()}
                </div>
            </a>
            <a
              id="add-stemma-button-link"
              class="link-secondary"
              href="#"
              aria-label="Add a stemma to this tradition">
                <div>
                  ${feather.icons['plus-circle'].toSvg()}
                </div>
            </a>
            <a
              id="delete-stemma-button-link"
              class="link-secondary"
              href="#"
              aria-label="delete this stemma">
                <div class="delete-stemma-danger">
                  ${feather.icons['trash'].toSvg()}
                </div>
            </a>
        `;
  }
}

customElements.define('edit-stemma-buttons', EditStemma);
