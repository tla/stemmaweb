
class MessageConsole extends HTMLElement {

  constructor() {
    super();
  }
      
  connectedCallback() {
    this.render();
  }
  
  static reset() {
    const messageConsoleTextPanel = document.querySelector( '#message-console-text-panel' );
    messageConsoleTextPanel.innerHTML = '';
  }

  static addMessage( message, type ){
    const messageConsoleTextPanel = document.querySelector( '#message-console-text-panel' );
    var consoleInnerHTML = messageConsoleTextPanel.innerHTML;
    consoleInnerHTML = `<span class="console-message ${type}">${timestamp()}: ${message}</span><br/>` + consoleInnerHTML;
    messageConsoleTextPanel.innerHTML = consoleInnerHTML;
  }

  render() {
    this.innerHTML = `
      <div class="position-sticky pt-2">
      <h6
        class="sidebar-heading d-flex justify-content-between align-items-center px-3 mt-2 text-muted"
      >
        <span>Message console</span>
        <!--maybe-goes-here-a-button/-->
      </h6>
      <div class="px-3 py-1">
        <div id="message-console-text-panel">
        </div>
      </div>

      </div>
    `;
  }
}
  
customElements.define( 'message-console', MessageConsole );
