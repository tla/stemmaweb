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
 * Service class to interact with the Stemmarest API through high-level
 * functions. The main purpose of this class is to encapsulate the logic needed
 * for communication with the REST API, such as where the REST API is deployed
 * and what endpoints are available.
 *
 * {@link https://dhuniwien.github.io/tradition_repo/|Stemmarest Docs}
 */
class StemmarestService extends BaseService {
  /** @param {string} baseUrl The base URL of the Stemmarest API. */
  constructor(baseUrl) {
    super(baseUrl);
  }

  /** @returns {string} The URL to initiate a Google OAuth login. */
  get oAuthHrefGoogle() {
    return this.endpoint('/oauth-google');
  }

  /** @returns {string} The URL to initiate a GitHub OAuth login. */
  get oAuthHrefGithub() {
    return this.endpoint('/oauth-github');
  }

  /**
   * @typedef {Object} CheckUserResponse
   * @property {StemmawebUserState | null} user
   * @returns {Promise<BaseResponse<CheckUserResponse>>}
   */
  checkUser() {
    return this.fetch('/user');
  }

  /**
   * @param dto {RegisterUserDTO}
   * @returns {Promise<BaseResponse<StemmawebUser>>}
   */
  registerUser(dto) {
    return this.fetch('/register', {
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
    return this.fetch('/login', {
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
    return this.fetch('/logout');
  }

  /**
   * Fetches a list of all traditions from the Stemmarest API.
   *
   * @returns {Promise<BaseResponse<Tradition[]>>}
   * @see {@link https://dhuniwien.github.io/tradition_repo/|Stemmarest Endpoint: /traditions}
   */
  listTraditions() {
    return this.fetch('/api/traditions');
  }

  /**
   * Fetches a tradition by its ID from the Stemmarest API.
   *
   * @param {string} tradId
   * @returns {Promise<BaseResponse<Tradition>>}
   * @see {@link https://dhuniwien.github.io/tradition_repo/|Stemmarest Endpoint: /tradition/[tradId]}
   */
  getTradition(tradId) {
    return this.fetch(`/api/tradition/${tradId}`);
  }

  /**
   * Deletes a tradition from the Stemmarest API.
   *
   * @param {string} tradId
   * @see {@link https://dhuniwien.github.io/tradition_repo/|Stemmarest Endpoint: /tradition/[tradId]}
   */
  deleteTradition(tradId) {
    return this.fetch(`/api/tradition/${tradId}`, {
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
    formData.append('public', isPublic );
    return this.fetch('/api/tradition', {
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
    return this.fetch(`/api/tradition/${tradId}/stemmata`);
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
    const endpoint = this.endpoint(
      `/api/tradition/${tradId}/stemma/${name}/reorient/${nodeId}`
    );
    // TODO: Update this to use `this.fetch` and return a `BaseResponse`
    return fetch(endpoint, { method: 'POST' }).then((response) =>
      response.json()
    );
  }

  /**
   * Updates metadata for a tradition.
   *
   * @param {string | null} userId
   * @param {string} tradId - The ID of the tradition being queried
   * @param {string} name - The (new) name of the tradition.
   * @param {string | null} language
   * @param {string} direction
   * @param {boolean} isPublic
   * @returns {Promise<BaseResponse<T>>}
   */
  updateTraditionMetadata( userId, tradId, name, language, direction, isPublic) {
    if (userId === null) {
      return Promise.resolve({
        success: false,
        message: 'You need to be logged in to edit a tradition.'
      });
    }
    const formData = {
      direction: direction,
      is_public: isPublic,
      id: tradId,
      language: language,
      name: name,
      owner: userId
    };
    return this.fetch(`/api/tradition/${tradId}`, {
      method: 'PUT',
      body: JSON.stringify(formData),
      headers: new Headers({ 'Content-Type': 'application/json' })
    });
  }

  /**
   * Fetches a list of sections for a particular tradition.
   *
   * @param {string} traditionId
   * @returns {Promise<BaseResponse<Section[]>>}
   * @see {@link https://dhuniwien.github.io/tradition_repo/|Stemmarest Endpoint: /tradition/[tradId]/sections}
   */
  listSections( traditionId ) {
    return this.fetch(`/api/tradition/${traditionId}/sections`);
  }

  /**
   * Deletes a section using the Stemmarest API.
   *
   * @param {string} sectionId
   * @see {@link https://dhuniwien.github.io/tradition_repo/|Stemmarest Endpoint: /tradition/[tradId]}
   */
  deleteSection( traditionId, sectionId ) {
    return this.fetch(`/api/tradition/${traditionId}/section/${sectionId}`, {
      method: 'DELETE'
    });
  }
  
  /**
   * Adds a new Section to a Tradition using the Stemmarest API.
   *
   * @param {string} name - The name of the tradition to be added.
   * @param {File} file - The file containing the tradition to be added.
   * @param {TraditionFileType} fileType
   * @param {string | null} userId
   * @returns {Promise<BaseResponse<{ tradId: string }>>}
   */
  addSection( name, file, fileType, userId, parentId ) {
    if (userId === null) {
      return Promise.resolve({
        success: false,
        message: 'You need to be logged in to add a section.'
      });
    }
    const formData = new FormData();
    formData.append('name', name);
    formData.append('file', file);
    formData.append('filetype', fileType);
    formData.append('userId', userId);
    formData.append('parentId', parentId);
    return this.fetch( `/api/tradition/${parentId}/section`, {
      method: 'POST',
      'Content-Type': 'multipart/form-data',
      body: formData
    });
  }
  
  /**
   * 
   * @param {string} tradId - Id of the tradition that the section belongs to
   * @param (string) sectionId
   * @param {string} priorSectionId 
   * 
   * @returns * @returns {Promise<BaseResponse<T>>}
   */
  moveSection( tradId, sectionId, priorSectionId ) {
    return this.fetch(`/api/tradition/${tradId}/section/${sectionId}/orderAfter/${priorSectionId}`, {
      method: 'PUT'
    });
  }

  /**
   * Updates metadata for a section.
   *
   * @param {string | null} userId
   * @param {string} tradId - The ID of the tradition to which the section belongs.
   * @param {string} sectionId - The ID of the section.
   * @param {string} name - The (new) name of the section.
   * @param {string | null} language
   * @returns {Promise<BaseResponse<T>>}
   */
  updateSectionMetadata( userId, tradId, sectionId, name, language ) {
    if (userId === null) {
      return Promise.resolve({
        success: false,
        message: 'You need to be logged in to edit a section.'
      });
    }
    const formData = {
      id: sectionId,
      language: language,
      name: name,
    };
    return this.fetch(`/api/tradition/${tradId}/section/${sectionId}`, {
      method: 'PUT',
      body: JSON.stringify(formData),
      headers: new Headers({ 'Content-Type': 'application/json' })
    });
  }

  /**
   * Fetches a list of relation types for a particular tradition.
   *
   * @param {string} traditionId
   * @returns {Promise<BaseResponse<Section[]>>}
   * @see {@link https://dhuniwien.github.io/tradition_repo/|Stemmarest Endpoint: /tradition/[tradId]/relationtypes}
   */
    listRelationTypes( traditionId ) {
      return this.fetch(`/api/tradition/${traditionId}/relationtypes`);
    }
  
  
}
