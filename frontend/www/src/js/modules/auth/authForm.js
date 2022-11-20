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
         id="pills-login"
         role="tabpanel"
         aria-labelledby="tab-login">
      <form>
        <div class="text-center mb-3">
          <p>Sign in with:</p>
          <social-login-options></social-login-options>
        </div>

        <p class="text-center">or:</p>

        <!-- Email input -->
        <div class="form-outline mb-4">
          <input type="email" id="loginName" class="form-control" />
          <label class="form-label" for="loginName">Email or username</label>
        </div>

        <!-- Password input -->
        <div class="form-outline mb-4">
          <input type="password" id="loginPassword" class="form-control" />
          <label class="form-label" for="loginPassword">Password</label>
        </div>

        <!-- 2 column grid layout -->
        <div class="row mb-4">
          <div class="col-md-6 d-flex justify-content-center">
            <!-- Checkbox -->
            <div class="form-check mb-3 mb-md-0">
              <input class="form-check-input" type="checkbox" value="" id="loginCheck" checked />
              <label class="form-check-label" for="loginCheck"> Remember me </label>
            </div>
          </div>

          <div class="col-md-6 d-flex justify-content-center">
            <!-- Simple link -->
            <a href="#!">Forgot password?</a>
          </div>
        </div>

        <!-- Submit button -->
        <button type="submit" class="btn btn-primary btn-block mb-4">Sign in</button>

        <!-- Register buttons -->
        <div class="text-center">
          <p>Not a member? <a href="#!">Register</a></p>
        </div>
      </form>
    </div>
    `;
  }
}

customElements.define('login-form', LoginForm);

class RegisterForm extends HTMLElement {
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
        id="pills-register"
        role="tabpanel"
        aria-labelledby="tab-register"
      >
        <form>
          <div class="text-center mb-3">
            <p>Sign up with:</p>
            <social-login-options></social-login-options>

          <p class="text-center">or:</p>

          <!-- Name input -->
          <div class="form-outline mb-4">
            <input type="text" id="registerName" class="form-control" />
            <label class="form-label" for="registerName">Name</label>
          </div>

          <!-- Username input -->
          <div class="form-outline mb-4">
            <input type="text" id="registerUsername" class="form-control" />
            <label class="form-label" for="registerUsername">Username</label>
          </div>

          <!-- Email input -->
          <div class="form-outline mb-4">
            <input type="email" id="registerEmail" class="form-control" />
            <label class="form-label" for="registerEmail">Email</label>
          </div>

          <!-- Password input -->
          <div class="form-outline mb-4">
            <input type="password" id="registerPassword" class="form-control" />
            <label class="form-label" for="registerPassword">Password</label>
          </div>

          <!-- Repeat Password input -->
          <div class="form-outline mb-4">
            <input
              type="password"
              id="registerRepeatPassword"
              class="form-control"
            />
            <label class="form-label" for="registerRepeatPassword"
              >Repeat password</label
            >
          </div>

          <!-- Checkbox -->
          <div class="form-check d-flex justify-content-center mb-4">
            <input
              class="form-check-input me-2"
              type="checkbox"
              value=""
              id="registerCheck"
              checked
              aria-describedby="registerCheckHelpText"
            />
            <label class="form-check-label" for="registerCheck">
              I have read and agree to the terms
            </label>
          </div>

          <!-- Submit button -->
          <button type="submit" class="btn btn-primary btn-block mb-3">
            Sign in
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
          href="#pills-login"
          role="tab"
          aria-controls="pills-login"
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
          href="#pills-register"
          role="tab"
          aria-controls="pills-register"
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
