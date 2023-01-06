/**
 * @typedef {import('@types/stemmaweb').AuthState} AuthState
 *
 * @typedef {import('@types/stemmaweb').StemmawebUserState} StemmawebUserState
 */

class AuthStore extends StateStore {
  /** @param {AuthState} initialState */
  constructor(initialState) {
    super(initialState);
  }

  /** @returns {AuthState} State */
  get state() {
    return super.state;
  }

  /** @param {StemmawebUserState} user */
  setUser(user) {
    this.setState({ ...this.state, user });
  }

  /** @param {(function(AuthState): void)|(function(AuthState, AuthState): void)} listener */
  subscribe(listener) {
    super.subscribe(listener);
  }
}

const AUTH_STORE = new AuthStore({ user: null });

/** @type {StemmarestService} */
const authStateStoreService = stemmarestService;

/**
 * Initializes the user state of the app by checking the server for a logged-in
 * user. The session cookie is used in the background to determine whether a
 * user is logged in.
 */
function initState() {
  authStateStoreService
    .checkUser()
    .then((res) => AUTH_STORE.setUser(res.data.user))
    .catch(console.error);
}

/** Load user asynchronously from the server. */
window.addEventListener('load', initState);
