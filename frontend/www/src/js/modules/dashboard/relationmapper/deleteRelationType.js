/** @typedef {import('@types/stemmaweb').BaseResponse} BaseResponse */

/**
 * Object to interact with the Stemmarest Middleware's API through high-level
 * functions.
 *
 * @type {StemmarestService}
 */
const deleteRelationTypeService = stemmarestService;

class DeleteRelationType extends HTMLElement {

  #name = '';

  constructor( relationTypeData ) {
    super();
    this.#name = relationTypeData.name;
    this.addEventListener( 'click', this.handleDelete );
  }

  connectedCallback() {
    this.render();
  }

  handleDelete() {
    const { selectedTradition: tradition } = TRADITION_STORE.state;
    StemmawebDialog.show(
      'Delete Relation Type',
      `<p>Are you sure you want to delete the relation type <span class="fst-italic">${this.#name}</span>?</p>`,
      {
        onOk: () => {
          deleteRelationTypeService.deleteRelationType( tradition.id, this.#name ).then( (res) => {
            if (res.success) {
              document.querySelector( 'relation-types' ).renderRelationTypes( {'display': 'block', 'opacity': 1 } );
              StemmawebAlert.show(
                `<p class="d-inline">Deleted relation type <span class="fst-italic">${this.#name}</span></p>`,
                'success'
              );
              // SECTION_STORE.sectionDeleted( section.id, tradition.id );
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
            aria-label="Delete relation type"
        ><span class="btn-outline-danger">${feather.icons['trash-2'].toSvg()}</span></a>
    `;
  }

}

customElements.define( 'delete-relation-type-button', DeleteRelationType );