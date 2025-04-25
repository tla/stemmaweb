/** @typedef {import('@types/stemmaweb').BaseResponse} BaseResponse */

/**
 * Object to interact with the Stemmarest Middleware's API through high-level
 * functions.
 *
 * @type {StemmarestService}
 */
const deleteSectionService = stemmarestService;

class DeleteSection extends HTMLElement {

  constructor() {
    super();
    this.addEventListener( 'click', this.handleDelete );
  }

  connectedCallback() {
    this.render();
  }

  handleDelete() {
    const { selectedTradition: tradition } = TRADITION_STORE.state;
    const { selectedSection: section, availableSections } = SECTION_STORE.state;
    StemmawebDialog.show(
      'Delete Section',
      `<p>Are you sure you want to delete <span class="fst-italic">${section.name}</span>?</p>`,
      {
        onOk: () => {
          deleteSectionService.deleteSection( tradition.id, section.id ).then((res) => {
            if (res.success) {
              StemmawebAlert.show(
                `<p class="d-inline">Deleted <span class="fst-italic">${section.name}</span></p>`,
                'success'
              );
              SECTION_STORE.sectionDeleted( section.id, tradition.id );
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

  render() {
    this.innerHTML = `
        <a
            class="link-secondary"
            href="#"
            aria-label="Delete section properties"
        ><span class="btn-outline-danger">${feather.icons['trash-2'].toSvg()}</span></a>
    `;
  }

}

customElements.define( 'delete-section-button', DeleteSection );