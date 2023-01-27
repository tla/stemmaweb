/**
 * @typedef {{
 *   owner: string;
 *   access: string;
 *   language: string;
 *   direction: string;
 *   tradition: string;
 *   witnesses: string;
 * }} TraditionMetaLabels
 *
 * @typedef {{ stemma: string }} StemmaMetaLabels
 *
 * @typedef {{ label: string; value: string; inputOptions?: InputOptions }} MetaItem
 *
 * @typedef {import('@types/stemmaweb').Tradition} Tradition
 *
 * @typedef {import('@types/stemmaweb').Stemma} Stemma
 */

class PropertyTableView extends HTMLElement {
  constructor() {
    super();
    // Whenever a new tradition / related stemma is selected, update the table
    STEMMA_STORE.subscribe(({ parentTradition, selectedStemma }) => {
      this.render(parentTradition, selectedStemma);
    });
  }

  /** @type {TraditionMetaLabels} */
  static traditionMetadataLabels = {
    tradition: 'Tradition',
    direction: 'Direction',
    owner: 'Owner',
    access: 'Access',
    language: 'Language',
    witnesses: 'Witnesses',
    name: 'Name'
  };

  /** @type {StemmaMetaLabels} */
  static #stemmaMetadataLabels = {
    stemma: 'Stemma'
  };

  /**
   * @typedef {{
   *   value: string;
   *   display: string;
   * }} SelectOption
   *
   * @typedef {{
   *   size: number;
   *   required: boolean;
   *   label?: string;
   * } & (
   *   | {
   *       control: 'dropdown';
   *       size: number;
   *       required: boolean;
   *       selectOptions: SelectOption[];
   *     }
   *   | {
   *       control: 'text' | 'checkbox';
   *       size: number;
   *       required: boolean;
   *     }
   * )} InputOptions
   */

  /** @type {SelectOption[]} */
  static #directionOptions = [
    {
      value: 'LR',
      display: 'Left to Right'
    },
    {
      value: 'RL',
      display: 'Right to Left'
    },
    {
      value: 'BI',
      display: 'Bi-directional'
    }
  ];

  /**
   * Maps 'LR' etc. to more readable 'Left to right' form.
   *
   * @param {string} key
   * @returns {string}
   */
  static #mapDirection(key) {
    const directionMap = this.#directionOptions.reduce(function (
      options,
      option
    ) {
      options[option.value] = option.display;
      return options;
    },
    {});
    return directionMap[key] || key;
  }

  /**
   * @param {Tradition} tradition Tradition to render the metadata for.
   * @returns {MetaItem[]} Array of metadata items to display.
   */
  static metadataFromTradition(tradition) {
    const labels = PropertyTableView.traditionMetadataLabels;
    return [
      {
        label: labels.tradition,
        value: tradition.id
      },
      {
        label: labels.direction,
        value: this.#mapDirection(tradition.direction),
        inputOptions: {
          control: 'dropdown',
          selectOptions: this.#directionOptions
        }
      },
      {
        label: labels.owner,
        value: tradition.owner
      },
      {
        label: labels.access,
        value: tradition.is_public ? 'Public' : 'Private',
        inputOptions: { control: 'checkbox', label: 'Allow public access?' }
      },
      {
        label: labels.language,
        value: tradition.language,
        inputOptions: { control: 'text', size: 20 }
      },
      {
        label: labels.witnesses,
        value: tradition.witnesses,
        inputOptions: { control: 'text', size: 80, required: true }
      }
    ];
  }

  /**
   * @param {Stemma} stemma Stemma to render the metadata for.
   * @returns {MetaItem[]} Array of metadata items to display.
   */
  static #metadataFromStemma(stemma) {
    const labels = PropertyTableView.#stemmaMetadataLabels;
    return [
      {
        label: labels.stemma,
        value: stemma.identifier
      }
    ];
  }

  /**
   * Array defining the custom order of the metadata table rows.
   *
   * @type {string[]}
   */
  static #metadataLabelOrder = [
    PropertyTableView.traditionMetadataLabels.tradition,
    PropertyTableView.#stemmaMetadataLabels.stemma,
    PropertyTableView.traditionMetadataLabels.owner,
    PropertyTableView.traditionMetadataLabels.access,
    PropertyTableView.traditionMetadataLabels.language,
    PropertyTableView.traditionMetadataLabels.direction,
    PropertyTableView.traditionMetadataLabels.witnesses
  ];

  /**
   * Sorts the metadata items by the order defined in
   * {@link PropertyTableView.#metadataLabelOrder}.
   *
   * @param {MetaItem[]} items Array of metadata items to sort.
   * @returns {MetaItem[]} Sorted array of metadata items.
   */
  static sortedMetaItems(items) {
    return items.sort((a, b) => {
      const aIndex = PropertyTableView.#metadataLabelOrder.indexOf(a.label);
      const bIndex = PropertyTableView.#metadataLabelOrder.indexOf(b.label);
      return aIndex - bIndex;
    });
  }

  connectedCallback() {
    this.render(null, null);
  }

  /**
   * @param {MetaItem} item
   * @returns {string}
   */
  renderMetaItem(item) {
    return `
        <tr>
          <td>${item.label}</td>
          <td>${item.value}</td>
        </tr>
      `;
  }

  /**
   * @param {Tradition | null} tradition
   * @param {Stemma | null} stemma
   */
  render(tradition, stemma) {
    /** @type {MetaItem[]} */
    const traditionMeta = tradition
      ? PropertyTableView.metadataFromTradition(tradition)
      : [];
    /** @type {MetaItem[]} */
    const stemmaMeta = stemma
      ? PropertyTableView.#metadataFromStemma(stemma)
      : [];
    const metaItems = PropertyTableView.sortedMetaItems([
      ...traditionMeta,
      ...stemmaMeta
    ]);
    this.innerHTML = `
      <div class="position-sticky pt-3">
      <h6
        class="sidebar-heading d-flex justify-content-between align-items-center px-3 mt-4 mb-1 text-muted"
      >
        <span>Properties</span>
        <edit-properties-button/>

      </h6>

      <div class="table-responsive px-3 py-3">
        <table class="table table-striped table-sm">
          <tbody id="tradition_info">
          ${metaItems.map(this.renderMetaItem).join('\n')}
          </tbody>
        </table>
        <another-button/>
      </div>

    </div>
    `;
  }
}

customElements.define('property-table-view', PropertyTableView);
