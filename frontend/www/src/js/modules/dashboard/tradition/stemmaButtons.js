/**
 * Object to interact with the Stemmarest Middleware's API through high-level
 * functions.
 *
 * @type {StemmarestService}
 */
const stemmaButtonsService = stemmarestService;

class StemmaButtons extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
  }

  static handleDelete() {
    const { selectedTradition: tradition, availableTraditions } =
      TRADITION_STORE.state;
    StemmawebDialog.show(
      'Delete Tradition',
      `<p>Are you sure you want to delete <span class="fst-italic">${tradition.name}</span>?</p>`,
      {
        onOk: () => {
          stemmaButtonsService.deleteTradition(tradition.id).then((res) => {
            if (res.success) {
              StemmawebAlert.show(
                `<p class="d-inline">Deleted <span class="fst-italic">${tradition.name}</span></p>`,
                'success'
              );
              // Update client-side state
              const traditionsWithoutDeleted = availableTraditions.filter(
                (t) => t.id !== tradition.id
              );
              TRADITION_STORE.setState({
                availableTraditions: traditionsWithoutDeleted,
                selectedTradition: traditionsWithoutDeleted[0] || null
              });
            } else {
              StemmawebAlert.show(
                `Error during deletion: ${res.message}`,
                'danger'
              );
            }
          });
        }
      },
      {
        okLabel: 'Yes, delete it',
        okType: 'danger',
        closeLabel: 'Cancel',
        closeType: 'secondary'
      }
    );
  }

  static hide() {
    document.getElementById('stemma_buttons').classList.add('invisible');
  }

  render() {
    this.innerHTML = `
    <div id="stemma_buttons" class="btn-toolbar mb-2 mb-md-0 invisible">
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
        <button type="button"
                class="btn btn-sm btn-outline-danger"
                onclick="StemmaButtons.handleDelete()">
          <span data-feather="trash"></span>
          Delete
        </button>
      </div>
    </>
    `;
  }
}
customElements.define('stemma-buttons', StemmaButtons);
