/**
 * @typedef {{
 *   owner: string;
 *   access: string;
 *   language: string;
 *   direction: string;
 *   tradition: string;
 *   witnesses: string;
 *   name: string;
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
    STEMMA_STORE.subscribe( ( { tradition, selectedStemma } ) => {
      this.render( tradition, selectedStemma );
    } );
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
   *   label?: string;
   * } & (
   *   | {
   *       control: 'dropdown';
   *       selectOptions: SelectOption[];
   *     }
   *   | {
   *       control: 'text';
   *       size: number;
   *       required: boolean;
   *     }
   *   | {
   *       control: 'checkbox';
   *       checked: boolean;
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
   * @param {'LR' | 'RL' | 'BI'} direction - Abbreviation of a tradition's
   *   direction
   * @returns {'Left to right' | 'Right to left' | 'Bi-directional'} User
   *   friendly label for the supplied abbreviation
   */
  static #mapDirection(direction) {
    const directionMap = this.#directionOptions.reduce(function (
      options,
      option
    ) {
      options[option.value] = option.display;
      return options;
    },
    {});
    return directionMap[direction] || direction;
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
          selectOptions: this.#directionOptions,
          selected: tradition.direction
        }
      },
      {
        label: labels.owner,
        value: tradition.owner
      },
      {
        label: labels.access,
        value: tradition.is_public ? 'Public' : 'Private',
        inputOptions: {
          control: 'checkbox',
          checked: tradition.is_public,
          label: 'Allow public access?'
        }
      },
      {
        label: labels.language,
        value: tradition.language,
        inputOptions: { control: 'text', size: 20 }
      },
      {
        label: labels.witnesses,
        value: tradition.witnesses.sort().join( ', ' ),
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
          <td class="tradition-property-label-cell">${item.label}</td>
          <td class="tradition-property-value-cell">${item.value}</td>
        </tr>
      `;
  }

  hide() {
    fadeToDisplayNone( document.querySelector( 'property-table-view div' ) );
  }

  show() {
    fadeToDisplayNone( document.querySelector( 'property-table-view div' ), { 'reverse': true } );
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
      <div class="position-sticky pt-2">
      <h6
        class="sidebar-heading d-flex justify-content-between align-items-center px-3 mt-2 text-muted"
      >
        <span>Tradition Properties</span>
        <edit-properties-button/>
      </h6>
      <div class="table-responsive px-3 py-1">
        <table class="table table-striped table-sm">
          <tbody id="tradition_info">
          ${metaItems.map(this.renderMetaItem).join('\n')}
          </tbody>
        </table>
      </div>

    </div>
    `;
  }
}

customElements.define('property-table-view', PropertyTableView);
