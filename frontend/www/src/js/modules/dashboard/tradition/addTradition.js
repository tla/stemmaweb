/**
 * Object to interact with the Stemmarest Middleware's API through high-level
 * functions.
 *
 * @type {StemmarestService}
 */
const addTraditionService = stemmarestService;

class AddTraditionModal extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
    this.#initModal();
    this.#initForm();
    this.#initStyles();
  }

  static #show_new_tradition_partial() {
    $('add_tradition_modal_addition_type_choice').classList.add('hide');
    $('texttradition_literal').innerText = 'text / tradition';
    $('tradition_literal').innerText = 'tradition';
    $('add_tradition_partial').classList.remove('hide');
    $('new_tradition_partial').classList.remove('hide');
  }

  static #show_new_section_partial() {
    $('add_tradition_modal_addition_type_choice').classList.add('hide');
    $('texttradition_literal').innerText = 'section';
    $('tradition_literal').innerText = 'section';
    $('add_tradition_partial').classList.remove('hide');
    $('new_section_partial').classList.remove('hide');
  }

  static #hide() {
    document
      .querySelector(
        '#add_tradition_modal_savecancel .add-tradition-modal_close'
      )
      .click();
  }

  #initModal() {
    // Initialize the add_tradition_modal dialog
    const add_tradition_modal_elem = $('add_tradition_modal');
    new bootstrap.Modal(add_tradition_modal_elem);
    // Make sure the right partial of the form is shown when section or tradition is chosen
    const button_new_tradition = $('button_new_tradition');
    button_new_tradition.addEventListener(
      'click',
      AddTraditionModal.#show_new_tradition_partial
    );
    const button_new_section = $('button_new_section');
    button_new_section.addEventListener(
      'click',
      AddTraditionModal.#show_new_section_partial
    );
    // Make sure, on cancel the form is returned to pristine state
    add_tradition_modal_elem.addEventListener('transitionend', function (evt) {
      if (
        evt.target === add_tradition_modal_elem &&
        !add_tradition_modal_elem.classList.contains('show')
      ) {
        [
          'add_tradition_partial',
          'new_tradition_partial',
          'new_section_partial'
        ].forEach(function (elem) {
          $(elem).classList.add('hide');
        });
        $('add_tradition_modal_addition_type_choice').classList.remove('hide');
        $('add_tradition_form').classList.remove('was-validated');
      }
    });
  }

  #initForm() {
    // JavaScript for disabling form submissions if there are invalid fields
    // Fetch all the forms we want to apply custom Bootstrap validation styles to
    const forms = document.querySelectorAll(
      'add-tradition-modal .needs-validation'
    );
    // Loop over them and prevent submission
    Array.prototype.slice.call(forms).forEach(function (form) {
      form.addEventListener(
        'submit',
        function (evt) {
          evt.preventDefault();
          evt.stopPropagation();
          if (form.checkValidity()) {
            const name = $('new_name').value;
            const file = $('uploadfile').files[0];
            const fileType = $('new_filetype').value;
            const userId = AUTH_STORE.state.user
              ? AUTH_STORE.state.user.id
              : null;
            const language = $('new_lang').value || null;
            const direction = $('direction').value;
            const isPublic = $('new_public').checked;
            addTraditionService
              .addTradition(
                name,
                file,
                fileType,
                userId,
                language,
                direction,
                isPublic
              )
              .then((res) => {
                if (res.success) {
                  StemmawebAlert.show('Tradition Created', 'success');
                  AddTraditionModal.#hide();
                } else {
                  StemmawebAlert.show(`Error: ${res.message}`, 'danger');
                }
              });
          }
          form.classList.add('was-validated');
        },
        false
      );
    });
  }

  #initStyles() {
    // This ensures the add_tradition_modal is placed nicely flush right of the menubar.
    // TODO: Add responsiveness on resize.
    const dashboard_stemmaweb_css = getStyleSheet('dashboard-stemmaweb');
    let add_tradition_modal_marginleft = window
      .getComputedStyle($('sidebarMenu'))
      .getPropertyValue('width');
    dashboard_stemmaweb_css.insertRule(
      '#add_tradition_modal.modal.fade div.modal-dialog { margin-left: ' +
        add_tradition_modal_marginleft +
        '; margin-top: 50px; transform: none; }'
    );
  }

  /**
   * Supported file type options.
   *
   * @type {[
   *   { value: import('@types/stemmaweb').TraditionFileType; name: string }
   * ]}
   */
  static #fileTypes = [
    { value: 'csv', name: 'Comma-separated values (spreadsheet collation)' },
    { value: 'tsv', name: 'Tab-separated values (spreadsheet collation)' },
    { value: 'xls', name: 'Microsoft Excel (spreadsheet values)' },
    { value: 'teips', name: 'TEI parallel segmentation' },
    { value: 'cte', name: 'CTE export (TEI double-endpoint attachment)' },
    { value: 'collatex', name: 'CollateX XML' },
    { value: 'cxjson', name: 'CollateX JSON' },
    { value: 'graphml', name: 'Native GraphML Zip' },
    { value: 'stemmaweb', name: 'Legacy Stemmaweb GraphML' }
  ];

  render() {
    this.innerHTML = `
      <div
        class="modal fade"
        id="add_tradition_modal"
        tabindex="-1"
        aria-labelledby="add_tradition_modal_label"
        aria-hidden="true"
      >
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Upload a new collation</h5>
              <button
                type="button"
                class="btn-close add-tradition-modal_close"
                data-bs-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>
            <div class="modal-body">
              <form
                id="add_tradition_form"
                class="needs-validation"
                novalidate=""
              >
                <div
                  id="add_tradition_modal_addition_type_choice"
                  class="d-grid gap-2"
                >
                  <button
                    id="button_new_tradition"
                    type="button"
                    class="btn btn-primary"
                  >
                    Create a new tradition
                  </button>
                  <button
                    id="button_new_section"
                    type="button"
                    class="btn btn-primary"
                  >
                    Add a section to an existing tradition
                  </button>
                </div>

                <!-- Shows when either button above is clicked -->
                <div id="add_tradition_partial" class="hide">
                  <label for="new_name" id="upload_name_field" class="form-label"
                    >Name of this
                    <span id="texttradition_literal"
                      >text / tradition</span
                    ></label
                  >
                  <input
                    id="new_name"
                    type="text"
                    name="name"
                    class="form-control has-validation"
                    size="40"
                    required=""
                  />
                  <div class="invalid-feedback">
                    We need at least a name to reference to this
                    <span id="tradition_literal">tradition</span>…
                  </div>
                  <br />
                  <label for="uploadfile" class="form-label"
                    >Collation file to upload</label
                  >
                  <input
                    class="form-control"
                    type="file"
                    id="uploadfile"
                    required=""
                  />
                  <div class="invalid-feedback">
                    We need a collation file to upload…
                  </div>
                  <br />
                  <label for="new_filetype" class="form-label">Data format</label>
                  <select name="filetype" class="form-select" id="new_filetype">
                    ${AddTraditionModal.#fileTypes
                      .map(
                        ({ value, name }) =>
                          `<option value="${value}">${name}</option>`
                      )
                      .join('\n')}
                  </select>
                  <br />

                  <!-- Shows when 'Create a new tradition' button is clicked -->
                  <div id="new_tradition_partial" class="hide">
                    <label for="new_lang" class="form-label"
                      >Primary language of the text</label
                    >
                    <input
                      id="new_lang"
                      type="text"
                      name="language"
                      class="form-control"
                      size="20"
                    />
                    <br />
                    <label for="direction" class="form-label"
                      >Text direction</label
                    >
                    <select name="direction" class="form-select" id="direction">
                      <option value="LR" selected="">Left to Right</option>
                      <option value="RL">Right to Left</option>
                      <option value="BI">Bi-directional</option>
                    </select>
                    <br />
                    <div class="form-check">
                      <input
                        class="form-check-input"
                        type="checkbox"
                        value=""
                        id="new_public"
                        name="public"
                      />
                      <label class="form-label form-check-label" for="new_public">
                        Allow public display
                      </label>
                    </div>
                  </div>

                  <!-- Shows when 'Add a section to an existing tradition' button is clicked -->
                  <div id="new_section_partial" class="hide">
                    <label for="upload_for_tradition" class="form-label"
                      >Add section to the following tradition</label
                    >
                    <select
                      name="for_tradition"
                      class="form-select"
                      id="upload_for_tradition"
                    ></select>
                  </div>

                  <!-- Shows in either case -->
                  <br />
                  <div id="add_tradition_modal_savecancel" class="py-3">
                    <button
                      type="button"
                      class="btn btn-secondary add-tradition-modal_close"
                      data-bs-dismiss="modal"
                    >
                      Close
                    </button>
                    <button type="submit" class="btn btn-primary">
                      Save changes
                    </button>
                  </div>
                </div>
              </form>
            </div>
            <!--
            <div class="modal-footer">
            </div>
          --></div>
        </div>
      </div>
    `;
  }
}
customElements.define('add-tradition-modal', AddTraditionModal);
