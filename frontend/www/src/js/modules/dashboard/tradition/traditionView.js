class TraditionView extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
    tabOverride.tabSize(4);
    const stemmaDotEditor = document.querySelector( '#stemma-dot-editor' );
    tabOverride.set( stemmaDotEditor );
  }

  static clearTradition() {
    document.getElementById('tradition-name').innerHTML = '';
    document.getElementById('graph-area').innerHTML = '';
    document.getElementById('stemma-selector').innerHTML = '';
    StemmaButtons.hide();
  }

  render() {
    this.innerHTML = `
      <div
        class="d-flex justify-content-between flex-wrap align-items-center pt-2 pb-1 border-bottom"
      >
        <tradition-title></tradition-title>
        <div class="d-flex justify-content-end ms-5 pt-3 mb-2 lex-nowrap" id="stemma_buttons_container">
          <stemma-buttons></stemma-buttons>
        </div>
      </div>


      <div id="stemma-editor-graph-container">

        <div id="stemma-editor-container">
          <textarea id="stemma-dot-editor">
          </textarea>
        </div>

        <div id="graph_container">
          <edit-stemma-button></edit-stemma-button>
  
          <div class="my-4 w-100" id="graph-area">
          </div>

          <div id="stemma-selector-container" class="collapse show">
          <div
            class="my-4 w-100 d-flex justify-content-center"
            id="stemma-selector"
          >
            <!-- svg_slide_indicators go here -->
          </div>
          </div>
        </div>
      
      </div>
      `;
  }
}

customElements.define('tradition-view', TraditionView);
