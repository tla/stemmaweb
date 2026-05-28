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
    // AUTH_STORE.subscribe( ( state ) => {
    //   const addRelationElementClassList = document.querySelector( 'add-relation-button-container a' ).classList;
    //   if( state.user ){
    //       if( addRelationElementClassList.contains( 'greyed-out' ) ){
    //           addRelationElementClassList.remove( 'greyed-out' );
    //           this.addEventListener( 'click', this.clickEventListener );
    //       }
    //   } else {
    //       if( !addRelationElementClassList.contains( 'greyed-out' ) ){
    //           addRelationElementClassList.add( 'greyed-out' );
    //           this.removeEventListener( 'click', this.clickEventListener );
    //       }
    //   }
    // } );
  }

  connectedCallback() {}

  createMigrationColorPicker = () => {
    const colors = [ 'sky', 'blue', 'mint', 'green', 'pink', 'red', 'peach', 'orange', 'plum', 'purple', 'lemon', 'brown' ];
    let colorIndex = 0;
    let numColorsProvided = 0;

    return {  
      getColor: ( color ) => {
        let providedColor = color;
        if ( !providedColor ) {
          providedColor = colors[colorIndex % colors.length];
          colorIndex++;
          numColorsProvided++;
        } 
        return providedColor;
      },
      getNumberOfColorsProvided: () => numColorsProvided
    };
  };

  /**
  * @param {RelationType} relationType
  * @returns {string} HTML representation of table row containing relation type information.
  */
  renderRelationType( relationType ) {
    const trElement = document.createElement( 'tr' );
    trElement.innerHTML = `
        <tr>
            <td class="relation-type-color-cell"><span class="relation-colors color-${relationType.display.color}">${feather.icons['square'].toSvg()}</span></td>
            <td class="relation-type-name-cell">${relationType.name}</td>
            <td class="relation-type-buttons-cell">
                <div class="relation-type-buttons">
                </div>
            </td>
        </tr>
      `;
    const divElement = trElement.querySelector( 'div' );
    divElement.appendChild( new DeleteRelationType( relationType ) );
    divElement.appendChild( new EditRelationType( relationType ) );
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
    const traditionId = TRADITION_STORE.state.selectedTradition.id;
    relationTypesService.getRelationTypes( traditionId ).then( ( relationTypes ) => {
      if ( relationTypes && relationTypes.length > 0 ) {          
        relationTypes = this.sortedRelationTypes( relationTypes );
        this.innerHTML = `
            <div class="position-sticky pt-2" style="display: ${usedOptions.display}; opacity: ${usedOptions.opacity};">
                <div id="relation-types-heading-container">
                    <h6 class="sidebar-heading d-flex justify-content-between align-items-center px-3 mt-2 text-muted">
                        <span>Relation Types</span>
                    </h6>
                    <div id="add-relation-button-container">
                        <a class="link-secondary greyed-out" href="#" aria-label="Add a new relation type">
                            <span><add-relation-type-button/></span>
                        </a>
                    </div>
                </div>
                <div class="table-responsive px-3 py-1">
                    <table class="table table-striped table-sm">
                        <tbody id="relation-type-info">
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        // Closure for the migration code below.
        const renderRelationTypeElements = () => {
          const relationTypesElements = colorSuppliedRelationTypes.map( this.renderRelationType );
          this.querySelector( '#relation-type-info' ).append( ...relationTypesElements  );
          if( usedOptions.onEnd ) {
            usedOptions.onEnd();
          }
        }

        /**
         * This is a bit of migration code. Because the old StemmaWeb did 
         * not have a way of specifying colors for relations we provide 
         * and store arbitrary colors for legacy traditions if they don't 
         * have defined relation ship colors. 
         */ 
        const migrationColorPicker = this.createMigrationColorPicker();
        const colorSuppliedRelationTypes = relationTypes.map( (relationType) => {
          const relationDisplay = relationType.display;
          const relationColor = migrationColorPicker.getColor( relationDisplay.color );
          relationType.display = { ...relationDisplay, 'color':relationColor }
          return relationType;
        } );
         // If any RelationType was migrated we now need to persist them.
        if ( migrationColorPicker.getNumberOfColorsProvided() > 0 ) {
          const userId = AUTH_STORE.state.user.id;
          /**
           * WE need to wait for the relationTypes to persist/update because
           * the display property of RelationType that we get from the serer
           * is a JSON-string-in-a-JSON-string, so we need to temporarily 
           * stringify it again to JSON-string-in-a-JSON-string for the update
           * and then parse it back into a proper JavaScript object.
           */
          relationTypesService.updateRelationTypes( userId, traditionId, relationTypes ).then( (relationTypes) => {
            renderRelationTypeElements();
          });
        } else {
           // Of course, if nothing needs migrated, just render already.
          renderRelationTypeElements();
        };
        /* End migration code. */

      }
    } );
  }

  unrender() {
    fadeToDisplayNone( document.querySelector( 'relation-types div' ) );
  }

}

customElements.define( 'relation-types', RelationTypes );