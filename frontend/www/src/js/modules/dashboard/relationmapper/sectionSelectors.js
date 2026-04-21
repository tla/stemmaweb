/**
 * Object to interact with the Stemmarest Middleware's API through high-level
 * functions.
 *
 * @type {StemmarestService}
 */
const sectionSelectorsService = stemmarestService;

class SectionSelectors extends HTMLElement {

  #scrollMessage = ' (Scroll to view more sections.)';
  #showScrollMessage = true;

  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
    SECTION_STORE.subscribe( this.onSectionStateChanged );
    const sectionSelectorsContainer = document.querySelector( 'section-selectors' );
    const sectionSelectorsElement = document.querySelector( '#section-selectors' );
    sectionSelectorsElement.addEventListener( 'scroll', this.scrollGage );
  }

  set showScrollMessage( bool ) {
    this.#showScrollMessage = bool;
  }
  get showScrollMessage() {
    return this.#showScrollMessage;
  }
  get scrollMessage() {
    return this.#scrollMessage;
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
        const sectionId = state.selectedSection.id;
        sectionSelectorsService.getSectionDot( TRADITION_STORE.state.selectedTradition.id, sectionId ).then( (resp) => {
          if ( resp.success ) {
            const graphArea = d3.select('#relation-graph');
            const stemmaButtonsElement = document.querySelector( 'stemma-buttons' );
            graphArea.transition().call( speedy_transition ).style( 'opacity', '0.0' ).on( 'end', () => {
              relationRenderer.renderRelationsGraph( 
                resp.data, {
                  'onEnd': () => { 
                    stemmaButtonsElement.setSectionTitle();
                    stemmaButtonsElement.addInRelations( sectionId );
                    stemmaButtonsElement.addInReadingInformation( sectionId );
                    graphArea.transition().call( mellow_transition ).style('opacity', '1.0' );
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
  
  scrollGage( evt ) {
    let sectionSelectorsContainer = document.querySelector( 'section-selectors' );  // => <section-selectors>
    let sectionSelectorsElement = evt.currentTarget;  // => <div id="section-selectors">
    // Note that the right padding here is a 100 px to have some decent scroll possibility if 
    // the container is just a tad too narrow and only one or a few section selector buttons
    // are not showing.
    if ( sectionSelectorsElement.scrollLeft > 100 ) {
      sectionSelectorsContainer.showScrollMessage = false;
      sectionSelectorsElement.removeEventListener( 'scroll', sectionSelectorsContainer.scrollGage );
    }
  }

  createTooltip( sectionName ) {
    let tooltip = `Click to go to section ${sectionName}.`;
    if ( this.#showScrollMessage && ( SECTION_STORE.state.availableSections.length > 17 ) ) {
        tooltip += this.#scrollMessage;
    }
    return tooltip;
  }

  static renderSectionSelectors() {
    const sections = SECTION_STORE.state.availableSections;
    const stemmaSelector = d3.select('#section-selectors');
    stemmaSelector.selectAll('*').remove();
    const hasData = sections && sections.length > 0;
    if ( hasData ) {
      stemmaSelector.insert( () => {
        const buttonElement = document.createElement( 'button' );
        buttonElement.setAttribute( 'id', 'section-selectors-menu-button' );
        buttonElement.setAttribute( 'class', 'btn btn-sm btn-outline-secondary dropdown-toggle' );
        buttonElement.setAttribute( 'data-bs-toggle', 'dropdown' );
        buttonElement.innerHTML = 'Select section';
        return buttonElement;
      } );
      stemmaSelector.append( () => {
        const dropDownMenuDiv = document.createElement( 'div' );
        dropDownMenuDiv.setAttribute( 'class', 'dropdown-menu' );
        dropDownMenuDiv.setAttribute( 'aria-labelledby', 'section-selector-dropdown-menu' );
        return dropDownMenuDiv;
      } )
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
          return `<div class="section-selector link-secondary${selectedAttr}" data-index="${i}">${feather.icons['file-text'].toSvg()} ${d.name}</div>`;
        } )
        .on( 'click', function (e, d) {
          // Update the state with the selected stemma
          SECTION_STORE.setSelectedSection( d );
        } );
    }

  }

  render() {
    this.innerHTML = `
      <div id="section-selector-buttons" class="collapse show">
        <div id="section-selectors">
        </div>
        <div id="section-title"></div>
      </div>
    `;
  }
}

customElements.define( 'section-selectors', SectionSelectors );