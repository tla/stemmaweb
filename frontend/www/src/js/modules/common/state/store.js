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
    this.state = initialState;
    this.listeners = [];
  }

  /**
   * Sets the state of the application to the specified state.
   *
   * @param {T} newState The new state of the application.
   */
  setState(newState) {
    Object.assign(this.state, newState);
    this.listeners.forEach((listener) => listener(this.state));
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
