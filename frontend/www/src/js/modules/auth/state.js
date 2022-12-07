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

  /**
   * @param {(state: AuthState) => void} listener The listener function to
   *   register.
   */
  subscribe(listener) {
    super.subscribe(listener);
  }
}

const AUTH_STORE = new AuthStore({ user: null });

/** @type {StemmarestService} */
const authStateStoreService = stemmarestService;

function initState() {
  authStateStoreService
    .checkUser()
    .then((res) => AUTH_STORE.setUser(res.data.user))
    .catch(console.error);
}

/** Load user asynchronously from the server. */
window.addEventListener('load', initState);
