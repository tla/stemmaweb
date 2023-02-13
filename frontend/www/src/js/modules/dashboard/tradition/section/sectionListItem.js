class SectionListItem extends HTMLElement {

    #section;

    constructor() {
        super();
    }

    connectedCallback() {
        this.render();
    }

    render() {
        this.innerHTML = `
            <li class="nav-item">
                <div class="section-name">${textIcon}</div>
            </li>`
    }

}

customElements.define( 'section-list-item', SectionListItem );