class AddTraditionModal extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.render();
  }

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
                    <option value="csv">
                      Comma-separated values (spreadsheet collation)
                    </option>
                    <option value="tsv">
                      Tab-separated values (spreadsheet collation)
                    </option>
                    <option value="xls">
                      Microsoft Excel (spreadsheet values)
                    </option>
                    <option value="teips">TEI parallel segmentation</option>
                    <option value="cte">
                      CTE export (TEI double-endpoint attachment)
                    </option>
                    <option value="collatex">CollateX XML</option>
                    <option value="cxjson">CollateX JSON</option>
                    <option value="graphml">Native GraphML Zip</option>
                    <option value="stemmaweb">Legacy Stemmaweb GraphML</option>
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
