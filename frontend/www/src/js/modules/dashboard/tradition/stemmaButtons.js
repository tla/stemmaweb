class StemmaButtons extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = `
    <div <div id="stemma_buttons" class="btn-toolbar mb-2 mb-md-0 invisible">
      <div class="btn-group me-2">
        <button type="button" class="btn btn-sm btn-outline-secondary">
          Examine Stemma
        </button>
        <button type="button" class="btn btn-sm btn-outline-secondary">
          Edit Collation
        </button>
      </div>
      <div class="btn-group me-2">
        <button type="button" class="btn btn-sm btn-outline-secondary">
          <span data-feather="download"></span>
          Tradition
        </button>
      </div>
      <div class="dropdown">
        <button
          type="button"
          class="btn btn-sm btn-outline-secondary dropdown-toggle"
          id="stemma_image_downloadbtn"
          data-bs-toggle="dropdown"
        >
          <span data-feather="download"></span>
          Stemma
        </button>
        <div
          class="dropdown-menu"
          aria-labelledby="stemma_image_downloadbtn"
        >
          <a class="dropdown-item" id="download_svg" href="#">.svg</a>
          <a class="dropdown-item" id="download_png" href="#">.png</a>
          <a class="dropdown-item" id="download_dot" href="#">.dot</a>
        </div>
      </div>
      <div class="btn-group ms-2">
        <button type="button" class="btn btn-sm btn-outline-danger">
          <span data-feather="trash"></span>
          Delete
        </button>
      </div>
    </div>
    `;
  }
}
customElements.define('stemma-buttons', StemmaButtons);
