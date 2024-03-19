class StemmaEditorButtons extends HTMLElement {

constructor() {
  super();
}

connectedCallback() {
  this.render();
  // EditStemma.addEditorButtinActions();
  // document.querySelector( '#save-stemma-button-link' ).addEventListener( 'click', (evt) => {
  //   console.log( 'hey' );
  //   // EditStemma.handleLeaveEditor( evt ) 
  // });
  // document.querySelector( '#cancel-edit-stemma-button-link' ).addEventListener( 'click', (evt) => {
  //   console.log( 'hay' );
  //   EditStemma.handleLeaveEditor( evt ) 
  // });
}

render() {
  this.innerHTML = `
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
`;
  }
}

customElements.define( 'stemma-editor-buttons', StemmaEditorButtons );
