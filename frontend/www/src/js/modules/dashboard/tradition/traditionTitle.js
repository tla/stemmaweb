/**
 * @typedef {import('@types/stemmaweb').TraditionState} TraditionState
 *
 * @typedef {import('@types/stemmaweb').Tradition} Tradition
 * 
 */

/**
 * Class representing the title of a tradition at the top of
 * the screen. Fades in the title if a new tradition is
 * selected.
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
                fadeIn( this );
            } else {
                if ( name != prevState.selectedTradition.name ) {
                    this.#title = name;
                    this.render();
                    fadeIn( this );
                }
            }
        });
    }

    connectedCallback() {
        this.render();
        fadeIn( this );
    }

    render() {
        this.innerHTML = `<h4 id="tradition_name" class="pt-3">${this.#title}</h4>`
    }

}

customElements.define( 'tradition-title', TraditionTitle );