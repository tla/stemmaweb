/**
 * @typedef {import('types/stemmaweb').BaseResponse} BaseResponse
 *
 * @typedef {import('types/stemmaweb').Tradition} Tradition
 *
 * @typedef {import('types/stemmaweb').TraditionFileType} TraditionFileType
 *
 * @typedef {import('types/stemmaweb').Stemma} Stemma
 *
 * @typedef {import('types/stemmaweb').RegisterUserDTO} RegisterUserDTO
 *
 * @typedef {import('types/stemmaweb').LoginUserDTO} LoginUserDTO
 *
 * @typedef {import('types/stemmaweb').StemmawebUser} StemmawebUser
 *
 * @typedef {import('types/stemmaweb').StemmawebUserState} StemmawebUserState
 */

/**
 * @param baseUrl {string}
 * @param params {Record<string, string>}
 * @returns {string}
 */
function constructFetchUrl(baseUrl, params) {
  if (Object.keys(params).length === 0) {
    return baseUrl;
  }
  const queryString = Object.keys(params)
    .map(
      (key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`
    )
    .join('&');
  return `${baseUrl}?${queryString}`;
}

/**
 * Utility function to fetch a specific endpoint.
 *
 * @template T
 * @function
 * @param endpoint {string} The endpoint to fetch.
 * @param options {RequestInit | undefined} The options to pass to the fetch
 *   call.
 * @param params {Record<string, string>} Query parameters to pass to the
 *   endpoint.
 * @returns {Promise<BaseResponse<T>>} The response from the fetch call.
 */
async function baseFetch(endpoint, options, params = {}) {
  const res = await fetch(constructFetchUrl(endpoint, params), options);
  const isJson = (res.headers.get('content-type') || '').includes(
    'application/json'
  );
  if (res.ok) {
    return {
      success: true,
      message: res.statusText,
      ...(isJson ? { data: await res.json() } : {})
    };
  } else {
    return {
      success: false,
      message: res.statusText,
      ...(isJson ? { data: await res.json() } : {})
    };
  }
}

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
   * Utility function to fetch a specific endpoint.
   *
   * @template T
   * @function
   * @param endpoint {string} The endpoint to fetch.
   * @param options {RequestInit | undefined} The options to pass to the fetch
   *   call.
   * @param params {Record<string, string>} Query parameters to pass to the
   *   endpoint.
   * @returns {Promise<BaseResponse<T>>} The response from the fetch call.
   */
  #fetch(endpoint, options = { method: 'GET' }, params = {}) {
    return baseFetch(`${this.#endpoint(endpoint)}`, options, params).catch(
      this.#handleFetchError
    );
  }

  /**
   * Generic way to handle errors from the fetch API.
   *
   * @param {any} errorReason - The reason for the error
   */
  #handleFetchError(errorReason) {
    console.error(
      "Error while interacting with the middleware's API:",
      errorReason
    );
  }

  /** @returns {string} The URL to initiate a Google OAuth login. */
  get oAuthHrefGoogle() {
    return this.#endpoint('oauth-google');
  }

  /** @returns {string} The URL to initiate a GitHub OAuth login. */
  get oAuthHrefGithub() {
    return this.#endpoint('oauth-github');
  }

  /**
   * @typedef {Object} CheckUserResponse
   * @property {StemmawebUserState | null} user
   * @returns {Promise<BaseResponse<CheckUserResponse>>}
   */
  checkUser() {
    return this.#fetch('user');
  }

  /**
   * @param dto {RegisterUserDTO}
   * @returns {Promise<BaseResponse<StemmawebUser>>}
   */
  registerUser(dto) {
    return this.#fetch('register', {
      method: 'POST',
      body: JSON.stringify(dto),
      headers: new Headers({ 'Content-Type': 'application/json' })
    });
  }

  /**
   * @param dto {LoginUserDTO}
   * @returns {Promise<BaseResponse<StemmawebUser>>}
   */
  loginUser(dto) {
    return this.#fetch('login', {
      method: 'POST',
      body: JSON.stringify(dto),
      headers: new Headers({ 'Content-Type': 'application/json' })
    });
  }

  /**
   * @typedef {Object} LogoutUserResponse
   * @property {'Logged out'} message
   * @returns {Promise<BaseResponse<LogoutUserResponse>>}
   */
  logoutUser() {
    return this.#fetch('logout');
  }

  /**
   * Fetches a list of all traditions from the Stemmarest API.
   *
   * @returns {Promise<BaseResponse<Tradition[]>>}
   * @see {@link https://dhuniwien.github.io/tradition_repo/|Stemmarest Endpoint: /traditions}
   */
  listTraditions() {
    return this.#fetch('api/traditions');
  }

  /**
   * Fetches a tradition by its ID from the Stemmarest API.
   *
   * @param {string} tradId
   * @returns {Promise<BaseResponse<Tradition>>}
   * @see {@link https://dhuniwien.github.io/tradition_repo/|Stemmarest Endpoint: /tradition/[tradId]}
   */
  getTradition(tradId) {
    return this.#fetch(`api/tradition/${tradId}`);
  }

  /**
   * Deletes a tradition from the Stemmarest API.
   *
   * @param {string} tradId
   * @see {@link https://dhuniwien.github.io/tradition_repo/|Stemmarest Endpoint: /tradition/[tradId]}
   */
  deleteTradition(tradId) {
    return this.#fetch(`api/tradition/${tradId}`, {
      method: 'DELETE'
    });
  }

  /**
   * Adds a new tradition to the Stemmarest API.
   *
   * @param {string} name - The name of the tradition to be added.
   * @param {File} file - The file containing the tradition to be added.
   * @param {TraditionFileType} fileType
   * @param {string | null} userId
   * @param {string | null} language
   * @param {string} direction
   * @param {boolean} isPublic
   * @returns {Promise<BaseResponse<{ tradId: string }>>}
   */
  addTradition(name, file, fileType, userId, language, direction, isPublic) {
    if (userId === null) {
      return Promise.resolve({
        success: false,
        message: 'You need to be logged in to add a tradition.'
      });
    }
    const formData = new FormData();
    formData.append('name', name);
    formData.append('file', file);
    formData.append('filetype', fileType);
    formData.append('userId', userId);
    if (language !== null) {
      formData.append('language', language);
    }
    formData.append('direction', direction);
    formData.append('public', isPublic ? 'yes' : 'no');
    return this.#fetch('api/tradition', {
      method: 'POST',
      'Content-Type': 'multipart/form-data',
      body: formData
    });
  }

  /**
   * Fetches a list of all the stemma associated with the tradition identified
   * by the supplied `tradId`.
   *
   * @param {string} tradId - The id of the tradition whose stemmata are to be
   *   fetched.
   * @returns {Promise<BaseResponse<Stemma[]>>}
   * @see {@link https://dhuniwien.github.io/tradition_repo/|Stemmarest Endpoint: /tradition/[tradId]/stemmata}
   */
  listStemmata(tradId) {
    return this.#fetch(`api/tradition/${tradId}/stemmata`);
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

  /**
   * Updates metadata for a tradition.
   *
   * @param {string} tradId - The ID of the tradition being queried
   * @param {string} name - The (new) name of the tradition.
   * @param {string | null} userId
   * @param {string | null} language
   * @param {string} direction
   * @param {boolean} isPublic
   * @returns {Promise<BaseResponse<T>>}
   */
  updateTraditionMetadata(tradId, name, userId, language, direction, isPublic) {
    if (userId === null) {
      return Promise.resolve({
        success: false,
        message: 'You need to be logged in to edit a tradition.'
      });
    }
    const formData = {
      direction: direction,
      is_public: isPublic ? true : false,
      id: tradId,
      language: language,
      name: name,
      owner: userId
    };
    return fetch(`api/tradition/${tradId}`, {
      method: 'PUT',
      body: JSON.stringify(formData),
      headers: new Headers({ 'Content-Type': 'application/json' })
    });
  }
}
