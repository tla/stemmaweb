/**
 * @typedef {import('@types/stemmaweb').TraditionState} TraditionState
 *
 * @typedef {import('@types/stemmaweb').Tradition} Tradition
 * 
 */

class TraditionTitle extends HTMLElement {

    #title = '';

    constructor() {
        super();
        // Check if we need to rerender whenever tradition or related stemma 
        // has changed.
        TRADITION_STORE.subscribe( ( prevState, state ) => {
            const name = state.selectedTradition.name;
            if ( prevState.selectedTradition == null ) {
                this.#title = name;
                this.render();
                this.fadeIn();
            } else {
                if ( name != prevState.selectedTradition.name ) {
                    this.#title = name;
                    this.render();
                    this.fadeIn();
                }
            }
        });
    }

    connectedCallback() {
        this.render();
        this.fadeIn();
    }

    fadeIn(){
        d3.select( this )
            .style('opacity', 0)
            .transition()
            .duration(500)
            .style('opacity', 1);
    }

    render() {
        this.innerHTML = `<h4 id="tradition_name" class="pt-3">${this.#title}</h4>`
    }

}

customElements.define( 'tradition-title', TraditionTitle );