
class MessageConsole extends HTMLElement {

  constructor() {
    super();
  }
      
  connectedCallback() {
    this.render();
  }
   
  static addMessage( message, type ){
    const messageConsoleTextPanel = document.querySelector( '#message-console-text-panel' );
    var consoleInnerHTML = messageConsoleTextPanel.innerHTML;
    consoleInnerHTML = `<span class="console-message ${type}">${timestamp()}: ${message}</span><br/>` + consoleInnerHTML;
    messageConsoleTextPanel.innerHTML = consoleInnerHTML;
  }

  render() {
    this.innerHTML = `
      <div class="position-sticky pt-3">
      <h6
        class="sidebar-heading d-flex justify-content-between align-items-center px-3 mt-4 mb-1 text-muted"
      >
        <span>Message console</span>
        <!--maybe-goes-here-a-button/-->
      </h6>
      <div class="px-3 py-3">
        <div id="message-console-text-panel">
        </div>
      </div>

      </div>
    `;
  }
}
  
customElements.define( 'message-console', MessageConsole );
