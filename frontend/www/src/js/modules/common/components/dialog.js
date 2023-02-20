/**
 * @typedef {Object} StemmawebDialogOptions
 * @property {string} closeLabel The label for the close button.
 * @property {| 'primary'
 *   | 'secondary'
 *   | 'success'
 *   | 'danger'
 *   | 'warning'
 *   | 'info'
 *   | 'light'
 *   | 'dark'} closeType
 *   The type of the close button.
 * @property {string} okLabel The label for the OK button.
 * @property {| 'primary'
 *   | 'secondary'
 *   | 'success'
 *   | 'danger'
 *   | 'warning'
 *   | 'info'
 *   | 'light'
 *   | 'dark'} okType
 *   The type of the OK button.
 * @property {string} elemStyle The style of the dialog.
 */

class StemmawebDialog extends HTMLElement {
  /** @type {StemmawebDialogOptions} */
  static #defaultOptions = {
    closeLabel: 'Close',
    closeType: 'secondary',
    okLabel: 'OK',
    okType: 'primary',
    elemStyle: ''
  };

  constructor() {
    super();
    this.modalTitle = 'Modal title';
    this.body = 'Body';
    this.closeLabel = StemmawebDialog.#defaultOptions.closeLabel;
    this.closeType = StemmawebDialog.#defaultOptions.closeType;
    this.onClose = () => {};
    this.okLabel = StemmawebDialog.#defaultOptions.okLabel;
    this.okType = StemmawebDialog.#defaultOptions.okType;
    this.onOk = () => {};
    this.elemStyle = StemmawebDialog.#defaultOptions.elemStyle;
  }

  static get observedAttributes() {
    return ['title', 'body', 'closeLabel', 'closeType', 'okLabel', 'okType'];
  }

  /**
   * @param title {string} The title of the dialog.
   * @param body {string | HTMLElement} The body of the dialog.
   * @param actions {Partial<{onOk: function(): void, onClose: function():
   *   void}>} Dialog action callbacks. is closed.
   * @param options {Partial<StemmawebDialogOptions>} The options for the
   *   dialog.
   */
  static show(
    title,
    body,
    actions = { onOk: () => {}, onClose: () => {} },
    options = {}
  ) {
    // remove any existing dialogs
    const existingDialogs = document.querySelectorAll('stemmaweb-dialog');
    existingDialogs.forEach((dialog) => dialog.remove());

    // create a new dialog and set its properties
    const element = document.createElement('stemmaweb-dialog');
    element.modalTitle = title;
    element.body = body;
    element.onClose = actions.onClose;
    element.onOk = actions.onOk;
    const usedOptions = { ...StemmawebDialog.#defaultOptions, ...options };
    element.closeLabel = usedOptions.closeLabel;
    element.closeType = usedOptions.closeType;
    element.okLabel = usedOptions.okLabel;
    element.okType = usedOptions.okType;
    element.elemStyle = usedOptions.elemStyle;

    // add the element to the DOM
    document.body.appendChild(element);

    // access the node inside the shadow DOM
    const dialog = document.getElementById('modalDialog');
    const dialogInstance = bootstrap.Modal.getOrCreateInstance(dialog);

    // Attach callbacks to the dialog's buttons
    const actionButtons = dialog.querySelectorAll('.modal-footer button');
    actionButtons[0].addEventListener('click', actions.onClose || (() => {}));
    actionButtons[1].addEventListener('click', () => {
      const handlerResult = (actions.onOk || (() => {}))();
      // Differentiate between handlers that are just handlers, and
      // handlers that are type Promise.
      if ( !handlerResult ) {
        // If there is no result from a handler we assume 200 OK and close the dialog.
        dialogInstance.hide();
      } else {
        // If the result is a successful Promise we close 
        // the dialog, but it remains open when it failed.
        if (typeof handlerResult.then === 'function') {
          handlerResult.then((promise) => {
            if (promise.success) {
              dialogInstance.hide();
            }
          });
        }
      }
    });

    // show the dialog
    dialogInstance.show();
  }

  attributeChangedCallback(property, oldValue, newValue) {
    if (oldValue === newValue) return;
    this[property] = newValue;
  }

  connectedCallback() {
    this.render();
  }
  // #modalDialog.modal.fade div.modal-dialog
  render() {
    this.innerHTML = `
    <div class="modal fade" id="modalDialog" tabindex="-1" aria-labelledby="modalDialogLabel" aria-hidden="true">
      <div class="modal-dialog" style="${this.elemStyle}">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="modalDialogLabel">${this.modalTitle}</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            ${this.body}
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-${this.closeType}" data-bs-dismiss="modal">${this.closeLabel}</button>
            <button type="button" class="btn btn-${this.okType}">${this.okLabel}</button>
          </div>
        </div>
      </div>
    </div>
    `;
  }
}
customElements.define('stemmaweb-dialog', StemmawebDialog);
