/**
 * @typedef {import('@types/stemmaweb').TraditionState} TraditionState
 *
 * @typedef {import('@types/stemmaweb').Tradition} Tradition
 * 
 */

/**
 * Class representing the all components and functions of the
 * relation mapper. 
 */
class RelationMapper extends HTMLElement {

    constructor() {
        super();
    }

    connectedCallback() {
        this.render();
    }

    render() {
        this.innerHTML = `<div id="relation-mapper-div" style="width:100%;"></div>`
    }

}

customElements.define( 'relation-mapper', RelationMapper );