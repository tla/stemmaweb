/**
 * Object to interact with the Stemmarest Middleware's API through high-level
 * functions.
 *
 * @type {StemmarestService}
 */
const relationTypesService = stemmarestService;

class RelationTypes extends HTMLElement {
  constructor() {
    super();
  }

  #colorsUsed = [];

  connectedCallback() {}

  /**
  * @param {RelationType} relationType
  * @returns {string} HTML representation of table row containing relation type information.
  */
  renderRelationType( relationType ) {
    const colors = [ 'sky', 'blue', 'mint', 'green', 'pink', 'red', 'peach', 'orange', 'plum', 'purple', 'lemon', 'brown' ];
    var remaining_colors = colors.filter( color => !this.includes( color ) );
    const color = remaining_colors[ Math.floor( Math.random() * remaining_colors.length ) ];
    this.push( color );
    const trElement = document.createElement( 'tr' );
    trElement.innerHTML = `
        <tr>
            <td class="relation-type-color-cell"><span class="relation-colors color-${color}">${feather.icons['square'].toSvg()}</span></td>
            <td class="relation-type-name-cell">${relationType.name}</td>
            <td class="relation-type-buttons-cell">
                <div class="relation-type-buttons">
                </div>
            </td>
        </tr>
      `;
    const divElement = trElement.querySelector( 'div' );
    divElement.appendChild( new DeleteRelationType( relationType ) );
    divElement.appendChild( new EditRelationType( relationType, color ) );
    return trElement;
  }

  /**
   * Sorts RelationTypes according to bindlevel.
   *
   * @param {RelationType[]} relationsTypes Array of relation types to sort.
   * @returns {RelationType[]} Sorted array of relation types.
   */
  sortedRelationTypes( relationTypes ) {
    return relationTypes.sort( (a, b) => {
      return a.bindlevel - b.bindlevel;
    } );
  }
  
  /**
   * Renders an HTML representation of a table listing the names and 
   * values of properties for the relation types of a tradition.
   * 
   * @param {{}} options - Additional options for this method. 
   * @returns void. 
   */
  renderRelationTypes( options={} ) {
    const defaultOptions = { 'onEnd': null, 'display': 'none', 'opacity': 0 };
    const usedOptions = { ...defaultOptions, ...options };
    relationTypesService.getRelationTypes( TRADITION_STORE.state.selectedTradition.id ).then( ( resp ) => {
      if ( resp.success ) {
        var relationTypesData = resp.data;
        if ( relationTypesData && ( relationTypesData.length > 0 ) ) {          
          relationTypesData = this.sortedRelationTypes( relationTypesData );
          this.innerHTML = `
              <div class="position-sticky pt-2" style="display: ${usedOptions.display}; opacity: ${usedOptions.opacity};">
                  <h6 class="sidebar-heading d-flex justify-content-between align-items-center px-3 mt-2 text-muted">
                     <span>Relation Types</span>
                  </h6>
                  <div class="table-responsive px-3 py-1">
                      <table class="table table-striped table-sm">
                          <tbody id="relation-type-info">
                          </tbody>
                     </table>
                  </div>
              </div>
          `;
          // TODO: This way of 'memorizing' color needs to be changed to a server stored state of course.
          var color_memo = [];
          const relationTypesElements = relationTypesData.map( this.renderRelationType, color_memo );
          this.querySelector( '#relation-type-info' ).append( ...relationTypesElements  );
          if( usedOptions.onEnd ) {
            usedOptions.onEnd();
          }
        }
      } else {
        StemmawebAlert.show(
          `Could not fetch relation types information: ${resp.message}`,
          'danger'
        );                
      }
    } );
  }

  unrender() {
    fadeToDisplayNone( document.querySelector( 'relation-types div' ) );
  }

  // render() {}

}

customElements.define( 'relation-types', RelationTypes );