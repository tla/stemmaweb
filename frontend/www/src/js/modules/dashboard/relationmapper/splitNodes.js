/** @typedef {import('@types/stemmaweb').BaseResponse} BaseResponse */

/**
 * Object to interact with the Stemmarest Middleware's API through high-level
 * functions.
 *
 * @type {StemmarestService}
 */
const splitNodesService = stemmarestService;

class SplitNodes extends HTMLElement {

  constructor() {
    super();
    this.addEventListener( 'click', this.handleSplitNodes );
  }

  connectedCallback() {
    this.render();
  }

  handleSplitNodes() {
    // TODO Implement splitting nodes.
    if( userIsOwner() ) {
      const { selectedTradition: tradition } = TRADITION_STORE.state;
      const { selectedSection: section, availableSections } = SECTION_STORE.state;
    }
    console.log( 'Split nodes not implemented.' );
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
            title="Split reading"
            aria-label="split reading button"
        ><span>${split_nodes_icon}</span></a>
    `;
  }

}

customElements.define( 'split-nodes-button', SplitNodes );