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
    if( this.isActive() && userIsOwner() ) {
      // const { selectedTradition: tradition } = TRADITION_STORE.state;
      // const { selectedSection: section, availableSections } = SECTION_STORE.state;
      const userId = AUTH_STORE.state.user.id;
      const selection = d3.select( '#relation-graph svg g' ).selectAll( 'g.node.selected' );
      if ( selection.size() != 2 ) {

      } else {
        const readingIds = []
        selection.each( (d) => readingIds.push( d.id ) );
        mergeNodesService.mergeReadings( userId, ...readingIds ).then( (resp) => {
          if ( resp.success ) {
            console.log( 'they were merged!' );
          } else {
            StemmawebAlert.show(
              `Could not fetch reading information for reading: ${resp.message}`,
              'danger'
            );                
          }
        } );
      }
    }
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
            title="Merge readings"
            aria-label="merge readings button"
        ><span>${merge_nodes_icon}</span></a>
    `;
  }

}

customElements.define( 'merge-nodes-button', MergeNodes );