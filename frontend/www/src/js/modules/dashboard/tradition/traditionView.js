class TraditionView extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
  }

  static clearTradition() {
    document.getElementById('tradition_name').innerHTML = '';
    document.getElementById('graph_area').innerHTML = '';
    document.getElementById('stemma_selector').innerHTML = '';
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


      <div class="my-4 w-100" id="graph_area"></div>

      <div
        class="my-4 w-100 d-flex justify-content-center"
        id="stemma_selector"
      >
        <!-- svg_slide_indicators go here -->
      </div>
    `;
  }
}

customElements.define('tradition-view', TraditionView);
