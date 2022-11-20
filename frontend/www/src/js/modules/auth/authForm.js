class SocialLoginOptions extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.innerHTML = `
      <button type="button" class="btn btn-link btn-floating mx-1">
        <i>${google_icon}</i>
      </button>
      <button type="button" class="btn btn-link btn-floating mx-1">
        <i>${github_icon}</i>
      </button>
    `;
  }
}

customElements.define('social-login-options', SocialLoginOptions);

class LoginForm extends HTMLElement {
  static ID = 'login';

  constructor() {
    super();
    this.active = 'false';
  }

  static get observedAttributes() {
    return ['active'];
  }

  attributeChangedCallback(property, oldValue, newValue) {
    if (oldValue === newValue) return;
    this[property] = newValue;
  }

  connectedCallback() {
    this.innerHTML = `
    <div class="tab-pane fade ${
      this.active === 'true' ? 'show active' : 'd-none'
    }"
         id="${LoginForm.ID}"
         role="tabpanel"
         aria-labelledby="tab-login">
      <form>
        <div class="text-center mb-3">
          <p>Sign in with:</p>
          <social-login-options></social-login-options>
        </div>

        <p class="text-center">or:</p>

        <!-- Email input -->
        <div class="form-floating mb-4">
          <input id="loginEmail" type="email" class="form-control" placeholder="Email">
          <label for="loginEmail">Email</label>
        </div>

        <!-- Password input -->
        <div class="form-floating mb-4">
          <input id="loginPassword" type="password" class="form-control" placeholder="Password">
          <label for="loginPassword">Password</label>
        </div>

        <!-- Submit button -->
        <button type="submit" class="btn btn-primary btn-block mb-4">Sign in</button>

        <!-- Register buttons -->
        <div class="text-center">
          <p>No account yet?
          <a href="#${RegisterForm.ID}"
             onclick="AuthForm.setMode('register')">Register
          </a>
          </p>
        </div>
      </form>
    </div>
    `;
  }
}

customElements.define('login-form', LoginForm);

class RegisterForm extends HTMLElement {
  static ID = 'register';
  constructor() {
    super();
    this.active = 'false';
  }

  static get observedAttributes() {
    return ['active'];
  }

  attributeChangedCallback(property, oldValue, newValue) {
    if (oldValue === newValue) return;
    this[property] = newValue;
  }

  connectedCallback() {
    this.innerHTML = `
    <div
        class="tab-pane fade ${
          this.active === 'true' ? 'show active' : 'd-none'
        }"
        id="${RegisterForm.ID}"
        role="tabpanel"
        aria-labelledby="tab-register"
      >
        <form>
          <div class="text-center mb-3">
            <p>Sign up with:</p>
            <social-login-options></social-login-options>
          </div>

          <p class="text-center">or:</p>

          <!-- Email input -->
          <div class="form-floating mb-4">
            <input id="registerEmail" type="email" class="form-control" placeholder="Email">
            <label for="registerEmail">Email</label>
          </div>

          <!-- Password input -->
          <div class="form-floating mb-4">
            <input id="registerPassword" type="password" class="form-control" placeholder="Password">
            <label for="registerPassword">Password</label>
          </div>

          <!-- Repeat Password input -->
          <div class="form-floating mb-4">
            <input id="registerRepeatPassword" type="password" class="form-control" placeholder="Repeat password">
            <label for="registerRepeatPassword">Repeat password</label>
          </div>

          <!-- Submit button -->
          <button type="submit" class="btn btn-primary btn-block mb-3">
            Sign Up
          </button>
        </form>
      </div>
    `;
  }
}

customElements.define('register-form', RegisterForm);

class AuthForm extends HTMLElement {
  constructor() {
    super();
    this.mode = 'login';
  }

  static get observedAttributes() {
    return ['mode'];
  }

  attributeChangedCallback(property, oldValue, newValue) {
    if (oldValue === newValue) return;
    this[property] = newValue;
    this.render();
  }

  inLoginMode() {
    return this.mode === 'login';
  }

  setMode(mode) {
    this.mode = mode;
  }

  static setMode(mode) {
    document.querySelector('auth-form').setAttribute('mode', mode);
  }

  connectedCallback() {
    this.render();
  }

  render() {
    this.innerHTML = `
    <!-- Pills navs -->
    <ul class="nav nav-pills nav-justified mb-3" id="ex1" role="tablist">
      <li class="nav-item" role="presentation">
        <a
          class="nav-link ${this.inLoginMode() ? 'active' : ''}"
          id="tab-login"
          data-mdb-toggle="pill"
          href="#${LoginForm.ID}"
          role="tab"
          aria-controls="${LoginForm.ID}"
          aria-selected="${this.inLoginMode()}"
          onclick="AuthForm.setMode('login')"
          >Login</a
        >
      </li>
      <li class="nav-item" role="presentation">
        <a
          class="nav-link ${!this.inLoginMode() ? 'active' : ''}"
          id="tab-register"
          data-mdb-toggle="pill"
          href="#${RegisterForm.ID}"
          role="tab"
          aria-controls="${RegisterForm.ID}"
          aria-selected="${!this.inLoginMode()}"
          onclick="AuthForm.setMode('register')"
          >Register</a
        >
      </li>
    </ul>
    <!-- Pills navs -->

    <!-- Pills content -->
    <div class="tab-content">
      <login-form active=${this.inLoginMode() ? 'true' : 'false'}></login-form>
      <register-form active=${
        !this.inLoginMode() ? 'true' : 'false'
      }></register-form>
    </div>
    <!-- Pills content -->
    `;
  }
}

customElements.define('auth-form', AuthForm);