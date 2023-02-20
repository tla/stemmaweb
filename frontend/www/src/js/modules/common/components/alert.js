class StemmawebAlert extends HTMLElement {
  constructor() {
    super();
    this.body = 'Body';
    this.type = 'primary';
  }

  /**
   * Creates and displays a new alert in the DOM with the given body and type.
   *
   * @param body {string} The body of the alert, may contain HTML
   * @param type {'primary' | 'secondary' | 'success' | 'danger' | 'warning' |
   *   'info' | 'light' | 'dark'} The type of the alert. Defaults to 'primary'.
   * @param autoHideMs {number | null} The number of milliseconds to wait before
   *   hiding the alert. The alert will not be hidden if this is null. Defaults
   *   to 3000.
   */
  static show(body, type = 'primary', autoHideMs = 3000) {
    const alert = document.createElement('stemmaweb-alert');
    alert.body = body;
    alert.type = type;
    document.body.appendChild(alert);
    if (autoHideMs !== null) {
      // Emulate a click on the close button to get the nice fade-out animation
      // and keep the UX consistent.
      setTimeout(() => {
        // Check if the button is there. It might have been clicked already by the user.
        const closeButton = alert.querySelector('button');
        if( closeButton ) { closeButton.click() };
      }, autoHideMs);
    }
  }

  static get observedAttributes() {
    return ['body', 'type'];
  }

  attributeChangedCallback(property, oldValue, newValue) {
    if (oldValue === newValue) return;
    this[property] = newValue;
  }

  connectedCallback() {
    this.render();
  }

  static #icons = `
  <svg xmlns="http://www.w3.org/2000/svg" style="display: none;">
      <symbol id="check-circle-fill" fill="currentColor" viewBox="0 0 16 16">
        <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
      </symbol>
      <symbol id="info-fill" fill="currentColor" viewBox="0 0 16 16">
        <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm.93-9.412-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.47l-.451-.081.082-.381 2.29-.287zM8 5.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2z"/>
      </symbol>
      <symbol id="exclamation-triangle-fill" fill="currentColor" viewBox="0 0 16 16">
        <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
      </symbol>
  </svg>
  `;

  #ICON_TYPE_MAP = {
    success: 'check-circle-fill',
    info: 'info-fill',
    warning: 'exclamation-triangle-fill',
    danger: 'exclamation-triangle-fill'
  };

  #iconComponent() {
    const icon = this.#ICON_TYPE_MAP[this.type];
    if (!icon) return '';
    return `
    <svg class="bi flex-shrink-0 me-2" width="24" height="24" role="img"><use xlink:href="#${icon}"/></svg>
  `;
  }

  render() {
    this.innerHTML = `
    ${StemmawebAlert.#icons}
    <div class="alert alert-${
      this.type
    } alert-dismissible fade show" role="alert">
      ${this.#iconComponent()}
      ${this.body}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
    `;
  }
}
customElements.define('stemmaweb-alert', StemmawebAlert);
