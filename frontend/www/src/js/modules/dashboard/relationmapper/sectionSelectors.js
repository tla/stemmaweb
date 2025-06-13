/**
 * Object to interact with the Stemmarest Middleware's API through high-level
 * functions.
 *
 * @type {StemmarestService}
 */
const sectionSelectorsService = stemmarestService;

class SectionSelectors extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
    SECTION_STORE.subscribe( this.onSectionStateChanged );
  }

  /**
 * This function will be called each time the state persisted in the
 * `SECTION_STORE` changes. It will update the UI to reflect the current
 * state.
 *
 * @param {SectionState} state
 */
  onSectionStateChanged( prevState, state ) {
    // First off, we don't need to do anything if we're not visible…
    if ( window.getComputedStyle( document.querySelector( 'relation-mapper' ) ).display != 'none' ) { 
      // We only do something if there is a selected section and if the section really changed.
      if ( state.selectedSection && ( state.selectedSection != prevState.selectedSection ) ) { 
        sectionSelectorsService.getSectionDot( TRADITION_STORE.state.selectedTradition.id, state.selectedSection.id ).then( (resp) => {
          if ( resp.success ) {
            const graphArea = d3.select('#relation-graph');
            document.querySelector( '#section-title' ).innerHTML = `${SECTION_STORE.state.selectedSection.name}`;
            graphArea.transition().call( speedy_transition ).style( 'opacity', '0.0' ).on( 'end', () => {
              relationRenderer.renderRelationsGraph( 
                resp.data, {
                  'onEnd': () => { 
                    graphArea.transition().call( mellow_transition ).style('opacity', '1.0' );
                    // Add in the reading information
                    sectionSelectorsService.getSectionReadings( TRADITION_STORE.state.selectedTradition.id, SECTION_STORE.state.selectedSection.id ).then( (resp) => {
                      if ( resp.success ) {
                        RelationMapper.addReadings( resp.data );
                      } else {
                        StemmawebAlert.show(
                          `Could not fetch reading information: ${resp.message}`,
                          'danger'
                        );                
                      }
                    });
                    //Add in relations information
                    sectionSelectorsService.getSectionRelations( TRADITION_STORE.state.selectedTradition.id, state.selectedSection.id ).then( (resp) => {
                      if ( resp.success ) {
                        // This was copied from `stemmaButtons.js`. The commented lines display the legend for
                        // existing relations. However, I assume that relation types are defined on tradition
                        // level, not on section level! So we do not need this copy from `stemmaButtons.js`.
                        // TODO: Check if it is correct that relations exist on tradition level.
                        // document.querySelector( 'relation-types' ).renderRelationTypes(
                        //   { 'onEnd': () => { fadeToDisplayNone( document.querySelector( 'relation-types div' ), { 'reverse': true } ) } }
                        // );
                        RelationMapper.addRelations( resp.data );
                      } else {
                        StemmawebAlert.show(
                          `Could not fetch relations information: ${resp.message}`,
                          'danger'
                        );                
                      }
                    } );

                  }
                }
              );
            } );
            SectionSelectors.renderSectionSelectors();
          } else {
            StemmawebAlert.show(
              `Could not fetch section graph information: ${resp.message}`,
              'danger'
            );
          }
        } );
      }
    }
  }
  
  static renderSectionSelectors() {
    const sections = SECTION_STORE.state.availableSections;
    // Here we put in the slide indicators that will allow the user to
    // switch to different sections in the relation mapper.
    const sectionSelector = d3.select('#section-selectors');
    sectionSelector.selectAll('*').remove();
    sectionSelector
      .selectAll( 'span' )
      .data( sections )
      .enter()
      .append( 'span' )
      .html( (d, i) => {
        const selectedIndex = SECTION_STORE.selectedIndex;
        const isSelected =
          (selectedIndex === -1 && i === 0) || selectedIndex === i;
        const selectedAttr = isSelected
          ? " selected"
          : "";
        return `<div class="section-selector link-secondary${selectedAttr}" data-index="${i}">${feather.icons['file-text'].toSvg()}</div>`;
      })
      .on( 'click', function (e, d) {
        // Update the state with the selected section
        SECTION_STORE.setSelectedSection( d );
      } );
  }

  render() {
    this.innerHTML = `
      <div id="section-selector-buttons" class="collapse show">
        <div id="section-selectors">
        </div>
      </div>
    `;
  }
}

customElements.define( 'section-selectors', SectionSelectors );