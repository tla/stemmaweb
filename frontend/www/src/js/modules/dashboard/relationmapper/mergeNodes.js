/** @typedef {import('@types/stemmaweb').BaseResponse} BaseResponse */

/**
 * Object to interact with the Stemmarest Middleware's API through high-level
 * functions.
 *
 * @type {StemmarestService}
 */
const mergeNodesService = stemmarestService;

class MergeNodes extends HTMLElement {

  constructor() {
    super();
    this.addEventListener( 'click', this.handleMergeNodes );
  }

  connectedCallback() {
    this.render();
  }

  handleMergeNodes() {
    // TODO Implement splitting nodes.
    if( userIsOwner() ) {
      const { selectedTradition: tradition } = TRADITION_STORE.state;
      const { selectedSection: section, availableSections } = SECTION_STORE.state;
    }
    console.log( 'Merge nodes not implemented.' );
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
            title="Merge readings"
            aria-label="merge readings button"
        ><span>${merge_nodes_icon}</span></a>
    `;
  }

}

customElements.define( 'merge-nodes-button', MergeNodes );