/** @typedef {import('@types/stemmaweb').BaseResponse} BaseResponse */

//todo: set Cancel instead of Save button

class AddRelationType extends EditRelationType {

  constructor( relationType ) {
    const defaultRelationType = {
      'name': 'A new relation type',
      'description': 'Description of this type.',
      'bindlevel': '0',
      'is_colocation': false,
      'is_transitive': false,
      'is_generalizable': false,
      'use_regular': false,
      'is_weak': false,
      'display': { 'color': 'sky' } 
    }
    super( defaultRelationType, 
      { 
        dialogTitle: 'Add relation type', 
        closeLabel: 'Cancel',
        onUpdated: () => {
          document.querySelector( 'relation-types' ).renderRelationTypes( {'display': 'block', 'opacity': 1 } );
        },
        succesMessage: 'New relation type saved.'
      } 
    );
    this.addEventListener( 'click', this.showDialog );
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = `
            <a
            class="link-secondary"
            href="#"
            aria-label="Add relation type"
            >
                <span>${feather.icons['plus-circle'].toSvg()}</span>
            </a>
        `;
  }
}

customElements.define( 'add-relation-type-button', AddRelationType );
