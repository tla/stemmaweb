/**
 * StateStore is a class that wraps the state of an application and provides
 * methods for updating and listening to changes to the state.
 *
 * @template T
 * @param {T} initialState The initial state of the application.
 */
class StateStore {
  /**
   * Constructs a new instance of the StateStore class.
   *
   * @template T
   * @param {T} initialState The initial state of the application.
   */
  constructor(initialState) {
    this._state = initialState;
    this.listeners = [];
  }

  /** @returns {T} */
  get state() {
    return this._state;
  }

  /**
   * Sets the state of the application to the specified state.
   *
   * @param {T} newState The new state of the application.
   */
  setState(newState) {
    Object.assign(this._state, newState);
    this.listeners.forEach((listener) => listener(this._state));
  }

  /**
   * Registers a listener function that will be called whenever the state is
   * updated.
   *
   * @param {(state: T) => void} listener The listener function to register.
   */
  subscribe(listener) {
    this.listeners.push(listener);
  }
}
