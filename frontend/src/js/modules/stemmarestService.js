import { types } from '../types';

/**
 * Service class to interact with the Stemmarest API through
 * high-level functions. The main purpose of this class is to
 * encapsulate the logic needed for communication with the REST API, such
 * as where the REST API is deployed and what endpoints are available.
 */
export default class StemmarestService {
  /**
   * Creates a new instance of the `StemmarestService` class.
   * @param {string} serverLocation - A url to the stemmarest server
   */
  constructor(serverLocation) {
    this.serverLocation = serverLocation;
  }

  /**
   * Constructs the full URL to be used for a request to the Stemmarest API
   * based on the supplied `pathSegment`.
   * @param {string} pathSegment - The path segment to be appended
   *                               to the base URL of the Stemmarest API,
   *                               such as `"/api/traditions"`.
   * @return {string} Full URL to be used for a request to the Stemmarest API,
   *                  using URI encoding.
   */
  #endpoint(pathSegment) {
    const rawEndpoint = `${this.serverLocation}/${pathSegment}`;
    return encodeURI(rawEndpoint);
  }

  /**
   * Generic way to handle errors from the fetch API.
   * @param {any} errorReason - The reason for the error
   */
  #handleFetchError(errorReason) {
    console.error(errorReason);
  }

  /**
   * Fetches a list of all traditions from the Stemmarest API.
   * @return {Promise<types.Tradition[]>}
   * @see {@link https://dhuniwien.github.io/tradition_repo/#-296807714-843083546|Stemmarest endpoint}
   */
  listTraditions() {
    const endpoint = this.#endpoint('api/traditions');
    return fetch(endpoint)
      .then((response) => response.json())
      .catch(this.#handleFetchError);
  }

  /**
   *
   * @param {string} tradId
   * @see {@link https://dhuniwien.github.io/tradition_repo/#-1976015424-407366191|Stemmarest endpoint}
   */
  listStemmata(tradId) {
    const endpoint = this.#endpoint(`api/tradition/${tradId}/stemmata`);
    return fetch(endpoint)
      .then((response) => response.json())
      .catch(this.#handleFetchError);
  }

  /**
   *
   * @param {string} tradId
   * @param {string} name
   * @param {string} nodeId
   * @return {Promise<object[]>}
   * @see {@link https://dhuniwien.github.io/tradition_repo/#4909786502023382895|Stemmarest endpoint}
   */
  reorientStemmaTree(tradId, name, nodeId) {
    // Note: see issue #92, API/middleware needs updating for non ASCII sigils
    const endpoint = this.#endpoint(`api/traditions/${tradId}/stemma/${name}/reorient/${nodeId}`);
    return fetch(endpoint, { method: 'POST' })
      .then((response) => response.json())
      .catch(this.#handleFetchError);
  }
}
