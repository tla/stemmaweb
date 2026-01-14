/** @typedef {import('@types/stemmaweb').BaseResponse} BaseResponse */

/**
 * Object to interact with the Stemmarest Middleware's API through high-level
 * functions.
 *
 * @type {StemmarestService}
 */
const concatenateNodesService = stemmarestService;

class ConcatenateNodes extends HTMLElement {

  constructor() {
    super();
    this.addEventListener( 'click', this.handleConcatenateNodes );
  }

  connectedCallback() {
    this.render();
  }

  handleConcatenateNodes() {
    // TODO Implement splitting nodes.
    if( this.isActive() && userIsOwner() ) {
      const { selectedTradition: tradition } = TRADITION_STORE.state;
      const { selectedSection: section, availableSections } = SECTION_STORE.state;
    }
    console.log( 'Concatenate nodes not implemented.' );
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
            title="Concatenate readings"
            aria-label="concatenate readings button"
        ><span>${concatenate_nodes_icon}</span></a>
    `;
  }

}

customElements.define( 'concatenate-nodes-button', ConcatenateNodes );