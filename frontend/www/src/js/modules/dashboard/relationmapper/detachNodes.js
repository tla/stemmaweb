/** @typedef {import('@types/stemmaweb').BaseResponse} BaseResponse */

/**
 * Object to interact with the Stemmarest Middleware's API through high-level
 * functions.
 *
 * @type {StemmarestService}
 */
const detachNodesService = stemmarestService;

class DetachNodes extends HTMLElement {

  constructor() {
    super();
    this.addEventListener( 'click', this.handleDetachNodes );
  }

  connectedCallback() {
    this.render();
  }

  handleDetachNodes() {
    // TODO Implement splitting nodes.
    if( this.isActive() && userIsOwner() ) {
      const { selectedTradition: tradition } = TRADITION_STORE.state;
      const { selectedSection: section, availableSections } = SECTION_STORE.state;
    }
    console.log( 'Detach nodes not implemented.' );
  }

  isActive() {
    return !this.querySelector( 'a' ).classList.contains( 'greyed-out' );
  }

  setInactive(){
    this.querySelector( 'a' ).classList.add( 'greyed-out' );
  }

  setActive(){
    this.querySelector( 'a' ).classList.remove( 'greyed-out' );
  }

  render() {
    var styleClasses = [ 'link-secondary', 'greyed-out' ];
    if( userIsOwner() ) {
      styleClasses.pop();
    }    
    this.innerHTML = `
        <a
            class="${styleClasses.join(' ')}"
            href="#"
            title="Detach reading"
            aria-label="detach reading button"
        ><span>${detach_nodes_icon}</span></a>
    `;
  }

}

customElements.define( 'detach-nodes-button', DetachNodes );