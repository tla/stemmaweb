/** @typedef {import('@types/stemmaweb').AuthState} AuthState */

/** @type {StateStore<AuthState>} */
const AuthStateStore = StateStore;
class AuthStore extends AuthStateStore {
  /** @param {AuthState} initialState */
  constructor(initialState) {
    super(initialState);
  }

  /** @param {Pick<AuthState, 'user'>} user */
  setUser(user) {
    this.setState({ ...this.state, user });
  }
}

const AUTH_STORE = new AuthStore({ user: null });

/** @type {StemmarestService} */
const authStateStoreService = stemmarestService;

function initState() {
  authStateStoreService
    .checkUser()
    .then((res) => AUTH_STORE.setUser(res.data))
    .catch(console.error);
}

/**
 * Load user asynchronously from the server.
 */
window.addEventListener('load', initState);
