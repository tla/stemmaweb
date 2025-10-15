const readingPropertiesService = stemmarestService;

class ReadingPropertiesView extends HTMLElement {

    constructor() {
        super();
        SECTION_STORE.subscribe( ( { availableSections, selectedSection } ) => {
            if ( selectedSection ) {
                this.updateRender( selectedSection );
            }
        } );
    }

    connectedCallback() {
        this.renderReadingProperties();
        document.querySelector( '#section-properties-tab' ).addEventListener( 'click', () => { 
            this.ensureSectionTabActive();
        } );
        document.querySelector( '#reading-properties-tab' ).addEventListener( 'click', () => { 
            this.ensureReadingTabActive();
        } );
    }

    hide() {
        fadeToDisplayNone( document.querySelector( 'reading-properties-view div' ) );
    }

    show() {
        this.setReadingActionButtonsInactive();
        fadeToDisplayNone( document.querySelector( 'reading-properties-view div' ), { 'reverse': true } );
    }

    renderReadingProperties( options ) {
        const defaultOptions = { 'onEnd': null, 'display': 'none', 'opacity': 0 };
        const usedOptions = { ...defaultOptions, ...options };        
        this.innerHTML = `
            <div class="position-sticky pt-2" style="display: ${usedOptions.display}; opacity: ${usedOptions.opacity};">
                <h6 class="sidebar-heading d-flex justify-content-between align-items-center px-3 mt-2 text-muted">
                    <ul id="section-reading-properties-tabs" class="stemmaweb-tabs">
                        <li id="section-properties-tab" class="active">Section</li>
                        <li id="reading-properties-tab">Readings</li>
                    </ul>
                    <div class="property-buttons">
                        <concatenate-nodes-button></concatenate-nodes-button>
                        <split-nodes-button></split-nodes-button> 
                        <detach-nodes-button></detach-nodes-button>
                        <merge-nodes-button></merge-nodes-button> 
                    </div>
                </h6>
                <div id="reading-properties-view-tabs-bottom-spacer" class="px-3">
                    <div id="reading-properties-view-tabs-bottom-spacer-background">
                    </div>
                </div>
                <div id="section-info-table-container" class="table-responsive px-3">
                    <table class="table table-striped table-sm">
                        <tbody id="section-info">
                        </tbody>
                    </table>
                </div>
                <div id="reading-info-table-container" class="table-responsive px-3 hide">
                    <table class="table table-striped table-sm">
                        <tbody id="reading-info">
                        </tbody>
                    </table>
                </div>
            </div>
        `;
        if( usedOptions.onEnd ) {
            usedOptions.onEnd();
        }
    }

    updateRender( section ){
        const sectionInfoTableContainerElement = document.querySelector( '#section-info-table-container' );
        const sectionPropertiesView = document.querySelector( 'section-properties-view' );
        const sectionMeta = SectionPropertiesView.sortedMetaItems( SectionPropertiesView.metadataFromSection( section ) );
        sectionInfoTableContainerElement.innerHTML = `
            <table class="table table-striped table-sm">
                <tbody id="section-info">
                    ${sectionMeta.map(sectionPropertiesView.renderMetaItem).join('\n')}
                </tbody>
            </table>
        `;
        this.ensureSectionTabActive();
    }

    ensureSectionTabActive() {
        document.querySelector( '#section-properties-tab' ).classList.add( 'active' );
        document.querySelector( '#reading-properties-tab' ).classList.remove( 'active' );
        document.querySelector( '#section-info-table-container' ).classList.remove( 'hide' );
        document.querySelector( '#reading-info-table-container' ).classList.add( 'hide' );
        this.setReadingActionButtonsInactive();
    }

    ensureReadingTabActive() {
        document.querySelector( '#section-properties-tab' ).classList.remove( 'active' );
        document.querySelector( '#reading-properties-tab' ).classList.add( 'active' );
        document.querySelector( '#section-info-table-container' ).classList.add( 'hide' );
        document.querySelector( '#reading-info-table-container' ).classList.remove( 'hide' );
        this.setReadingActionButtonsActive();
    }

    setReadingActionButtonsInactive() {
        document.querySelector( 'concatenate-nodes-button' ).setInactive();
        document.querySelector( 'split-nodes-button' ).setInactive();
        document.querySelector( 'detach-nodes-button' ).setInactive();
        document.querySelector( 'merge-nodes-button' ).setInactive();
    }

    setReadingActionButtonsActive() {
        // Do not activate buttons if no readings are selected. 
        if( document.querySelector( '#reading-info tr' ) ) {
            document.querySelector( 'split-nodes-button' ).setActive();
            document.querySelector( 'detach-nodes-button' ).setActive();
            // Do only show concatenate and merge buttons if multiple readings are selected.
            if( document.querySelector( '#reading-info tr td.reading-property-column-header' ) ) {
                document.querySelector( 'concatenate-nodes-button' ).setActive();
                document.querySelector( 'merge-nodes-button' ).setActive();
            }
        }
    }

    showReadingProperties( readingId ) {
        if( readingId ) {
            const traditionId = TRADITION_STORE.state.selectedTradition.id;
            const sectionId = SECTION_STORE.state.selectedSection.id;
            const sectionPropertiesView = document.querySelector( 'section-properties-view' );
            readingPropertiesService.getReading( traditionId, sectionId, readingId ).then( (resp) => {
                if ( resp.success ) {
                    const readingMeta = SectionPropertiesView.metadataFromReading( resp.data );
                    document.querySelector( '#reading-info-table-container #reading-info' ).innerHTML = readingMeta.map(sectionPropertiesView.renderMetaItem).join('\n');
                    this.setReadingActionButtonsInactive();
                    this.ensureReadingTabActive();
                } else {
                    StemmawebAlert.show(
                        `Could not fetch reading information for reading: ${resp.message}`,
                        'danger'
                    );                
                }
            } );
        } else {
            document.querySelector( '#reading-info-table-container #reading-info' ).innerHTML = '';
            this.setReadingActionButtonsInactive();
        }
    }

    showMultiReadingProperties( d3Selection ) {
        let sortedSelection = d3.sort( d3Selection, (a, b) => { 
            return d3.ascending( d3.select( a ).datum().rank, d3.select( b ).datum().rank );
        } );
        let promises = [];
        let readingMeta = null;
        let rows = '';
        const sectionPropertiesView = document.querySelector( 'section-properties-view' );
        sortedSelection.forEach( (selected) => {
            const traditionId = TRADITION_STORE.state.selectedTradition.id;
            const sectionId = SECTION_STORE.state.selectedSection.id;
            const readingId = d3.select( selected ).datum().id;
            promises.push(
                sectionPropertiesService.getReading( traditionId, sectionId, readingId )
                    .then( (resp) => {
                        if ( resp.success ) {
                            readingMeta = SectionPropertiesView.metadataFromReading( resp.data );
                            const cells = readingMeta.map(sectionPropertiesView.renderMetaItemWide).join('\n');
                            rows += '<tr>' + cells + '</tr>\n';
                        } else {
                            StemmawebAlert.show(
                                `Could not fetch reading information for reading: ${resp.message}`,
                                'danger'
                            );                
                        }
                    } )
            );
        } );
        Promise.all( promises ).then( () => { 
            const thead = readingMeta.map( sectionPropertiesView.renderMetaItemTHeadWide ).join('\n');
            rows = thead + '\n' + rows;
            document.querySelector( '#reading-info-table-container #reading-info' ).innerHTML = rows;
            this.ensureReadingTabActive();
        } );
        
    }

    //  display: a weird grphviz sspecific form of html to display in the Node, expose (transformer)
    //  join_next/join_prior: expose and join as two half elllipsis
    //  grammar invalid (isnonsen): expose
    //  orig_reading: don't expose
    //  is_lemma: expose, adn there is a backend call to change the node to a lemma-node and to set the others in the rank to non-lemma (i.e. normal)
    //  is_emendation: can be set to true, but not changed afterwards to a reading, can be delter
        // needed if is_emendation == true
        // emendation get a box shaped node
    //  rank: show, not editable
    //  is_start/is_end: internal use

}

customElements.define( 'reading-properties-view', ReadingPropertiesView );