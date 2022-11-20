/**
 * @typedef {import('www/src/js/modules/dashboard/stemmaweb').Tradition} Tradition
 *
 * @typedef {import('www/src/js/modules/dashboard/stemmaweb').Stemma} Stemma
 */

/**
 * Service class to interact with the Stemmarest API through high-level
 * functions. The main purpose of this class is to encapsulate the logic needed
 * for communication with the REST API, such as where the REST API is deployed
 * and what endpoints are available.
 */
class StemmarestService {
  /**
   * Creates a new instance of the `StemmarestService` class.
   *
   * @param {string} serverLocation - A url to the stemmarest server
   */
  constructor(serverLocation) {
    this.serverLocation = serverLocation;
  }

  /**
   * Constructs the full URL to be used for a request to the Stemmarest API
   * based on the supplied `pathSegment`.
   *
   * @param {string} pathSegment - The path segment to be appended to the base
   *   URL of the Stemmarest API, such as `"/api/traditions"`.
   * @returns {string} Full URL to be used for a request to the Stemmarest API,
   *   using URI encoding.
   */
  #endpoint(pathSegment) {
    const rawEndpoint = `${this.serverLocation}/${pathSegment}`;
    return encodeURI(rawEndpoint);
  }

  /**
   * Generic way to handle errors from the fetch API.
   *
   * @param {any} errorReason - The reason for the error
   */
  #handleFetchError(errorReason) {
    console.error(errorReason);
  }

  /**
   * Fetches a list of all traditions from the Stemmarest API.
   *
   * @returns {Promise<Tradition[]>}
   * @see {@link https://dhuniwien.github.io/tradition_repo/|Stemmarest Endpoint: /traditions}
   */
  listTraditions() {
    const endpoint = this.#endpoint('api/traditions');
    return fetch(endpoint)
      .then((response) => response.json())
      .catch(this.#handleFetchError);
  }

  /**
   * Fetches a list of all the stemma associated with the tradition identified
   * by the supplied `tradId`.
   *
   * @param {string} tradId - The id of the tradition whose stemmata are to be
   *   fetched.
   * @returns {Promise<Stemma[]>}
   * @see {@link https://dhuniwien.github.io/tradition_repo/|Stemmarest Endpoint: /tradition/[tradId]/stemmata}
   */
  listStemmata(tradId) {
    const endpoint = this.#endpoint(`api/tradition/${tradId}/stemmata`);
    return fetch(endpoint)
      .then((response) => response.json())
      .catch(this.#handleFetchError);
  }

  /**
   * Reorients a stemma tree so that the given witness node is the root
   * (archetype). This operation can only be performed on a stemma without
   * contamination links.
   *
   * @param {string} tradId - The ID of the tradition being queried
   * @param {string} name - The name of the requested stemma
   * @param {string} nodeId - Archetype node
   * @returns {Promise<object[]>} The updated stemma model
   * @see {@link https://dhuniwien.github.io/tradition_repo/|Stemmarest Endpoint: /tradition/[tradId]/stemma/[name]/reorient/[nodeId]}
   */
  reorientStemmaTree(tradId, name, nodeId) {
    // Note: see issue #92, API/middleware needs updating for non ASCII sigils
    const endpoint = this.#endpoint(
      `api/tradition/${tradId}/stemma/${name}/reorient/${nodeId}`
    );
    return fetch(endpoint, { method: 'POST' })
      .then((response) => response.json())
      .catch(this.#handleFetchError);
  }
}
