class TraditionView extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = `
      <div
        class="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom"
      >
        <h2 id="tradition_name">
          &nbsp;<!-- Tradition title placeholder -->
        </h2>
        <stemma-buttons></stemma-buttons>
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
