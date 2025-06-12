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
    // We may encounter the situation where there is no stemma (anymore).
    // It may also be that the user is not the owner.
    // In both cases we grey out the edit and delete stemma buttons, and in the latter also the add button.
    STEMMA_STORE.subscribe( ( state ) => {
        this.greyOut();
    } );
  }

  connectedCallback() {  
    const stemmaEditorContainerElement = document.querySelector( '#stemma-editor-container' );
    const stemmaDotEditorTextarea = document.querySelector( '#stemma-dot-editor' );
    // Attach a listener to know when we might need to re-render the stemma.
    stemmaDotEditorTextarea.addEventListener( 'keyup', (evt) => {
      const editorDot = stemmaDotEditorTextarea.value
      try {
        var ast = libraries.lib_DotParser.parse( editorDot );
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
          this.setEditorValue();
          this.renderEditorButtons();
          // Attach a listener to handle stuff happening outside the textarea of the editor.
          // E.g. asking if we should save when clicking non editor functions.
          document.querySelector( '#stemma-editor-graph-container-modal-backdrop' ).addEventListener( 'click', () => { this.handleLeaveEditor() } );
        } else {
          stemmaDotEditorTextarea.value = '';
          document.querySelector( '#stemma-editor-graph-container-modal-backdrop' ).remove();
        }
      };
    })
    this.render();
  }

  setEditorValue() {
    const stemmaDotEditorTextarea = document.querySelector( '#stemma-dot-editor' );
    const stemma = STEMMA_STORE.state.selectedStemma || { dot: '' };
    if( this.buttonAction == 'edit' ){
      stemmaDotEditorTextarea.value = stemma.dot;
    };
    if( this.buttonAction == 'add' ){
      const graphArea = d3.select('#graph-area');
      // We first fade out the existing graph…
      // TODO? The transition is a perfect copy of TraditionView.renderDefaultTraditionStemma.
      graphArea.transition().call( speedy_transition ).style( 'opacity', '0.0' ).on( 'end', () => {
        const exampleDigraph = this.createExampleStemma();
        stemmaDotEditorTextarea.value = exampleDigraph;
        // Finally we need to render the example stemma.
        const editorStemma = { dot: exampleDigraph }
        const tradition = STEMMA_STORE.state.tradition;
        stemmaRenderer.renderStemma( tradition, editorStemma );
      } );
    };
  }

  createExampleStemma() {
    // Let's create a simple bifurcating tree with the available witnesses as an example.
    const tab = '    ';
    var rootAndWitnesses = TRADITION_STORE.state.selectedTradition.witnesses.sort(); 
    rootAndWitnesses = rootAndWitnesses.slice( 0, 9 ); // [ 'A', 'B', 'C', … ]
    // Add an example hypothetical witness.
    rootAndWitnesses.splice( 1, 0, '"2"' ); // [ 'A', '"2"', 'B', 'C', … ]
    const witnesses = rootAndWitnesses.slice( 1, 10 ); // [ '"2"', 'B', 'C', … ]
    // Map the witnesses to a made up example stemma (as a bifurcating tree).
    // The index of the node in the array divided by 2 (floored) gives the index of the parent.
    const taxa = witnesses.map( (witness,idx) => `${tab}${rootAndWitnesses[Math.floor(idx/2)]} -> ${witness};` )
    // Add a hypothetical archetype on top for good measure.
    taxa.splice( 0, 0, `${tab}"\u03b1" -> ${rootAndWitnesses[0]};` )
    const taxaString = ( taxa.join( '\n' ) );
    const witnessDefinitions = rootAndWitnesses.map( (witness) => `${tab}${witness} [class=extant];` );
    // Correct the definition of the hypothetical witness.
    witnessDefinitions[1] = `${tab}"2" [class=hypothetical label="*"];`;
    // Add the archetype definition.
    witnessDefinitions.splice( 0, 0, `${tab}"\u03b1" [class=hypothetical label="\u03b1"];` );
    const witnessesString = witnessDefinitions.join( '\n' );
    const exampleDigraph = `digraph "New Stemma Name" {\n${witnessesString}\n${taxaString}\n}\n`;
    return exampleDigraph;
  }

  toggleStemmaEditor() {
    const stemmaEditorContainerElement = document.querySelector( '#stemma-editor-container' );
    stemmaEditorContainerElement.classList.toggle( 'expanded' );
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
    const graphContainerElement = document.querySelector( '#graph-container' );
    graphContainerElement.classList.toggle( 'shrunken' );
    this.render();
  }

  handleLeaveEditor() {
    StemmawebDialog.show(
      'Close stemma editor?',
      '<p>This action will close the stemma editor. However, you have unsaved changes. Should these changes be saved?</p>',
      {
        onOk: () => { 
          return this.handleSaveStemma();
        },
        onAlt: () => { 
          this.cancelEdits();
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
  }

  handleSaveStemma() {
    try {
      const stemmaDotEditorTextarea = document.querySelector( '#stemma-dot-editor' );
      const editor_dot = stemmaDotEditorTextarea.value;
      var ast = libraries.lib_DotParser.parse( editor_dot );
      // If no error we can try to save the stemma.
      const userId = AUTH_STORE.state.user ? AUTH_STORE.state.user.id : null;
      const tradId = TRADITION_STORE.state.selectedTradition.id;
      const stemma_dot = stemmaDotEditorTextarea.value;
      // Distinguish edit from add stemma, if add do a POST instead of a PUT
      if( this.buttonAction == 'add' ) {
        const stemma_name = ast[0].id;
        return( editStemmaService.addStemma( userId, tradId, stemma_name, stemma_dot ).then( (resp) => { return this.handleResponse( resp ) } ) );
      } else {
        const stemma_name = STEMMA_STORE.state.selectedStemma.identifier;
        return( editStemmaService.saveStemma( userId, tradId, stemma_name, stemma_dot ).then( (resp) => { return this.handleResponse( resp ) } ) );
      }
    } catch( { name, message } ) {
      StemmawebAlert.show(`Cannot save stemma: ${name} - ${message}`, 'danger');
      return Promise.resolve({
        success: false,
        message: message
      });
    }
  }

  handleDeleteStemma() {
    const tradId = TRADITION_STORE.state.selectedTradition.id;
    const stemma = STEMMA_STORE.state.selectedStemma;
    StemmawebDialog.show(
      'Delete Stemma',
      `<p>Are you sure you want to delete <span class="fst-italic">${stemma.identifier}</span>?</p>`,
      {
        onOk: () => {
          editStemmaService.deleteStemma( tradId, stemma ).then((res) => {
            if (res.success) {
              StemmawebAlert.show(
                `<p class="d-inline">Deleted <span class="fst-italic">${stemma.identifier}</span></p>`,
                'success'
              );
              STEMMA_STORE.stemmaDeleted( stemma );
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

  cancelEdits() {
    // reset the stemma rendered to the stemma in current state
    const { tradition, availableStemmata, selectedStemma } = STEMMA_STORE.state;
    // Render the stemma, or an empty one if there's none. 
    stemmaRenderer.renderStemma( tradition, selectedStemma || { dot: 'digraph {}' } );
    this.toggleStemmaEditor();    
    TraditionView.renderStemmaSelectors( availableStemmata );
  }

  /** @param {BaseResponse<T>} resp */
  handleResponse( resp ) {
    if (resp.success) {
      if( this.buttonAction == 'add' ){
        StemmawebAlert.show( 'Stemma added.', 'success' );
        STEMMA_STORE.stemmaAdded( resp.data );
      }
      if( this.buttonAction == 'edit' ){
        StemmawebAlert.show( 'Stemma saved.', 'success' );
        STEMMA_STORE.stemmaSaved( resp.data );
      }
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
  
  addEditStemmaButtonListeners() {
    // Adds listeners to the stemma edit, add, and delete buttons.
    // They need to be reset whenever the editor has been opened 
    // and the inner.html of `render` is deleted and supplanted 
    // by that of `renderEditorButtons`.  
    document.querySelector( '#edit-stemma-button-link' ).addEventListener( 'click', (evt) => {
      if( !evt.currentTarget.classList.contains( 'greyed-out' ) ){
        this.buttonAction = 'edit';
        this.toggleStemmaEditor();   
      };
    } );
    document.querySelector( '#add-stemma-button-link' ).addEventListener( 'click', () => { 
      this.buttonAction = 'add';
      this.toggleStemmaEditor(); 
    });
    document.querySelector( '#delete-stemma-button-link' ).addEventListener( 'click', (evt) => { 
      if( !evt.currentTarget.classList.contains( 'greyed-out' ) ){
        this.handleDeleteStemma();
      };
    } );  
  }

  greyOut() {
    if( userIsOwner() ) {
      var classAction = '';
      ( STEMMA_STORE.state.availableStemmata.length > 0 ) ? classAction = 'remove' : classAction = 'add';
      const editAndDeleteStemmaButtonLinkElement = [
        document.querySelector( '#edit-stemma-button-link' ),
        document.querySelector( '#delete-stemma-button-link' )
      ]
      editAndDeleteStemmaButtonLinkElement.forEach( (elem) => {
          if( elem ) {
            elem.classList[classAction]( 'greyed-out' );
          }
      } );
      var elem = document.querySelector( '#add-stemma-button-link' );
      if( elem ){
        document.querySelector( '#add-stemma-button-link' ).classList.remove( 'greyed-out' );
      }
    } else {
      const editAndDeleteStemmaButtonLinkElement = [
        document.querySelector( '#edit-stemma-button-link' ),
        document.querySelector( '#add-stemma-button-link' ),
        document.querySelector( '#delete-stemma-button-link' )
      ]
      editAndDeleteStemmaButtonLinkElement.forEach( (elem) => {
          if( elem ) {
            elem.classList.add( 'greyed-out' );
          }
      } );
    }
  }

  render() {
    this.innerHTML = `
      <div id="stemma-selector-buttons" class="collapse show">
        <div id="stemma-selectors">
        </div>
      </div>
      <div id="edit-stemma-buttons-right">      
        <a
          id="edit-stemma-button-link"
          class="link-secondary" href="#" aria-label="Edit this stemma">
            <div>
              ${feather.icons['edit'].toSvg()}
            </div>
        </a>
        <a
          id="add-stemma-button-link" class="link-secondary" href="#" aria-label="Add a stemma to this tradition">
            <div>
              ${feather.icons['plus-circle'].toSvg()}
            </div>
        </a>
        <a
          id="delete-stemma-button-link" class="link-secondary" href="#" aria-label="delete this stemma">
            <div class="delete-stemma-danger">
              ${feather.icons['trash'].toSvg()}
            </div>
        </a>
      </div>
    `;
    if( userIsOwner() ) {
      this.greyOut();
    }
    this.addEditStemmaButtonListeners();
  }

  addEditorButtonListeners() {
    // Adds listeners to the stemma save edits and cancel buttons.
    // They need to be reset whenever the editor is closed and the
    // inner.html of `renderEditorButtons` is deleted and supplanted 
    // by that if `render`.  
    document.querySelector( '#stemma-editor-help-button-link' ).addEventListener( 'click', (evt) => {
      const stemmaEditorHelpText = document.querySelector( '#stemma-editor-help-text' );
      stemmaEditorHelpText.classList.toggle( 'show' );
    });
    document.querySelector( '#save-stemma-button-link' ).addEventListener( 'click', (evt) => {
      this.handleSaveStemma();
    });
    document.querySelector( '#cancel-edit-stemma-button-link' ).addEventListener( 'click', (evt) => {
      this.cancelEdits();
    });
  }

  getAddNote() {
    var note = '';
    if( this.buttonAction=='add' ){
      note = `
        <p>
        The depicted graph description is not a computed stemma,
        but merely a random example based on some of the witness sigla
        available. It serves to show what constructs you can use, and 
        as a basis to work from.
        </p>
      `     
    }
    return note;
  }

  getDotHelpText() {
    return `
    <div id="dot-help">
      <h4>Editing a stemma</h4>
      ${this.getAddNote()}
      <p>
        All stemma definitions begin with the line
      </p>
      <div class="code">
        digraph "Stemma Name" {
      </div>
      <p>
        and end with the line
      </p>
      <div class="code">
        }
      </div>
      <p>
        Please do not change these lines except to edit the stemma name.
      </p>
      <p>
        First list each witness in your stemma, whether extant or lost 
        / reconstructed / hypothetical, and assign them a class of either 
        “extant” or “hypothetical”. For example:
      </p>
      <div class="code">
        α [ class=hypothetical ]
        C [ class=extant ]
      </div>        
      <p>
        Next, list the direct links between witnesses, one per line. 
        For example, if witness C descends directly from witness α, 
        note it as follows:
      </p>
      <div class="code">
        α -> C
      </div>
      <p>
        A witness may be the exemplar for any number of other witnesses, 
        whether extant or not; likewise, a witness may inherit from any 
        number of other witnesses. Use as many
      </p>
      <div class="code">
        "A -> B" 
      </div>
      <p>
      pairings as necessary to describe all genealogical relations.
      </p>
    </div>
    `;
  }

  renderEditorButtons() {
    this.innerHTML = `
    <div id="stemma-editor-buttons-container">
      <div id="stemma-editor-help-text">
      ${this.getDotHelpText()}
      </div>
      <div id="stemma-editor-help-button-container">
        <a
        id="stemma-editor-help-button-link"
        class="link-secondary"
        href="#"
        aria-label="Help">
          <div>
            ${feather.icons['help-circle'].toSvg()}
          </div>
        </a>
      </div>
      <div id="stemma-editor-save-cancel-buttons-container">
        <a
        id="save-stemma-button-link"
        class="link-secondary"
        href="#"
        aria-label="Save this stemma">
          <div>
            ${feather.icons['save'].toSvg()}
          </div>
        </a>
        <a
          id="cancel-edit-stemma-button-link"
          class="link-secondary"
          href="#"
          aria-label="Add a stemma to this tradition">
            <div>
              ${feather.icons['x'].toSvg()}
            </div>
        </a>
      </div>
    </div>
    `;
    this.addEditorButtonListeners();
  }
}

customElements.define('edit-stemma-buttons', EditStemma);
