(() => {
  const appCore = globalThis.AozAppCore;
  const popupUi = globalThis.AozPopupUi;

  function createAuthModule(state, deps) {
    // deps: { onSuccess }

    function _applyAuthMode() {
      const isSignIn = state.authMode === "signin";
      state.refs.authSubtitle.textContent = isSignIn ? state.t.auth_signin_title : state.t.auth_signup_title;
      state.refs.authSubmitBtn.textContent = isSignIn ? state.t.auth_signin_btn : state.t.auth_signup_btn;
      state.refs.authToggleBtn.textContent = isSignIn ? state.t.auth_goto_signup : state.t.auth_goto_signin;
      state.refs.authEmail.placeholder = state.t.auth_email_placeholder;
      state.refs.authPassword.placeholder = state.t.auth_password_placeholder;
      state.refs.googleSignInLabel.textContent = state.t.auth_google_btn;
      state.refs.authDividerText.textContent = state.t.auth_divider;
      state.refs.authMessage.textContent = "";
      state.refs.authMessage.classList.add("hidden");
    }

    function renderAuthView() {
      _applyAuthMode();
      popupUi.showPopupView(state.refs, "auth");
    }

    function handleAuthToggle() {
      state.authMode = state.authMode === "signin" ? "signup" : "signin";
      _applyAuthMode();
    }

    async function handleAuthSubmit() {
      if (state.authLoading) return;
      const email = state.refs.authEmail.value.trim();
      const password = state.refs.authPassword.value.trim();

      if (!email || !password) {
        state.refs.authMessage.textContent = state.t.auth_error_empty;
        state.refs.authMessage.classList.remove("hidden");
        return;
      }

      state.authLoading = true;
      state.refs.authSubmitBtn.disabled = true;
      state.refs.authMessage.textContent = "";
      state.refs.authMessage.classList.add("hidden");

      const result = await appCore.authWithEmail(state.authMode, email, password);
      state.authLoading = false;
      state.refs.authSubmitBtn.disabled = false;

      if (!result.ok) {
        state.refs.authMessage.textContent = state.t.auth_error_generic;
        state.refs.authMessage.classList.remove("hidden");
        return;
      }

      if (result.needsEmailConfirmation) {
        state.refs.authMessage.textContent = state.t.auth_confirm_email;
        state.refs.authMessage.classList.remove("hidden");
        return;
      }

      deps.onSuccess();
    }

    async function handleGoogleSignIn() {
      if (state.authLoading) return;

      state.authLoading = true;
      state.refs.googleSignInLabel.textContent = "...";
      state.refs.googleSignInBtn.disabled = true;

      const result = await appCore.signInWithGoogle();
      state.authLoading = false;
      state.refs.googleSignInBtn.disabled = false;
      state.refs.googleSignInLabel.textContent = state.t.auth_google_btn;

      if (!result.ok) {
        state.refs.authMessage.textContent = state.t.auth_error_generic;
        state.refs.authMessage.classList.remove("hidden");
        return;
      }

      deps.onSuccess();
    }

    async function handleSignOut() {
      await appCore.signOut();
      deps.onSuccess();
    }

    return {
      renderAuthView,
      handleSignOut,
      handleAuthSubmit,
      handleAuthToggle,
      handleGoogleSignIn,
    };
  }

  globalThis.AozPopupAuth = { createAuthModule };
})();
