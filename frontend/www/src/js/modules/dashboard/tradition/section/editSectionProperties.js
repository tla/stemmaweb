/**
 * This is just a placeholder for now.
 * 
 * @todo: riff of EditProperties.js after extracting form controls in their own classes.
 */
class EditSectionProperties extends HTMLElement {

    constructor() {
        super();
        this.addEventListener( 'click', () => {} );
    }

    connectedCallback() {
        this.render();
    }

    render() {
        this.innerHTML = `
                <a
                class="link-secondary"
                href="#"
                aria-label="Edit section properties"
                >
                    <span>${feather.icons['edit'].toSvg()}</span>
                </a>
            `;
    }
    }

customElements.define('edit-section-properties-button', EditSectionProperties);
