class TextDirectory extends HTMLElement {

    constructor() {
        super();
        AUTH_STORE.subscribe( ( state ) => { this.render(); } );
        this.addEventListener( 'click', () => {
            if( userIsLoggedIn() ) {
                bootstrap.Modal.getInstance( document.querySelector( '#add_tradition_modal' ) ).show();
            }
        } );  
    }
  
    connectedCallback() {
      this.render();
    }

    render() {
        var styleClasses = [ 'link-secondary', 'greyed-out' ];
        if( userIsLoggedIn() ){
          styleClasses.pop();
        }        
        this.innerHTML = `
          <span>Text directory</span>
            <a class="${styleClasses.join(' ')}" href="#" aria-label="Add a new tradition">
                <span>${feather.icons['plus-circle'].toSvg()}</span>
            </a>
        `;
    }

}

customElements.define( 'text-directory', TextDirectory );

