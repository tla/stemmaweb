class TextDirectory extends HTMLElement {

    constructor() {
        super();
        TRADITION_STORE.subscribe( ( state ) => {
            const textDirectoryElementClassList = document.querySelector( 'text-directory a' ).classList;
            if( userIsOwner() ){
                if( textDirectoryElementClassList.contains( 'greyed-out' ) ){
                    textDirectoryElementClassList.remove( 'greyed-out' );
                    this.addEventListener( 'click', this.clickEventListener );
                }
            } else {
                if( !textDirectoryElementClassList.contains( 'greyed-out' ) ){
                    textDirectoryElementClassList.add( 'greyed-out' );
                    this.removeEventListener( 'click', this.clickEventListener );
                }
            }
        } );
    }
  
    connectedCallback() {
      this.render();
    }

    clickEventListener() {
        bootstrap.Modal.getInstance( document.querySelector( '#add_tradition_modal' ) ).show();
    }

    render() {
        this.innerHTML = `
          <span>Text directory</span>
            <a class="link-secondary greyed-out" href="#" aria-label="Add a new tradition">
                <span>${feather.icons['plus-circle'].toSvg()}</span>
            </a>
        `;
    }

}

customElements.define( 'text-directory', TextDirectory );

