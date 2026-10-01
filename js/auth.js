import { $, esc } from "./ui.js";

export function passwordChecks(pw) {
  return [
    { ok: pw.length >= 6, label: "At least 6 characters" },
    { ok: (pw.match(/\d/g) || []).length >= 2, label: "At least 2 numbers" },
    { ok: /[A-Z]/.test(pw), label: "At least 1 capital letter" },
  ];
}

export function renderAuth(root, backend, onDone) {
  let mode = "login";
  const draw = () => {
    root.innerHTML = `
      <div class="auth-card">
        <div class="auth-logo">Look Max</div>
        <p class="auth-sub">${mode === "login" ? "Welcome back." : "Create your account."}</p>
        <form id="auth-form" novalidate>
          <label for="auth-email">Email</label>
          <input id="auth-email" type="email" autocomplete="email" inputmode="email" required>
          <label for="auth-pw">Password</label>
          <input id="auth-pw" type="password" autocomplete="${mode === "login" ? "current-password" : "new-password"}" required>
          ${mode === "signup" ? `<ul id="pw-rules" class="rules" aria-live="polite"></ul>` : ""}
          <p id="auth-error" class="error" role="alert" hidden></p>
          <button class="btn primary" id="auth-submit" type="submit">${mode === "login" ? "Log in" : "Sign up"}</button>
        </form>
        <button class="link" id="auth-toggle" type="button">${mode === "login" ? "New here? Create an account" : "Have an account? Log in"}</button>
      </div>`;
    const pw = $("#auth-pw", root);
    const showRules = () => {
      const ul = $("#pw-rules", root);
      if (!ul) return;
      ul.innerHTML = passwordChecks(pw.value).map((c) => `<li class="${c.ok ? "ok" : ""}"><span aria-hidden="true">${c.ok ? "✓" : "○"}</span> ${esc(c.label)}</li>`).join("");
    };
    showRules();
    pw.addEventListener("input", showRules);
    $("#auth-toggle", root).onclick = () => { mode = mode === "login" ? "signup" : "login"; draw(); };
    $("#auth-form", root).onsubmit = async (e) => {
      e.preventDefault();
      const err = $("#auth-error", root);
      const btn = $("#auth-submit", root);
      const email = $("#auth-email", root).value.trim();
      err.hidden = true;
      if (!/^\S+@\S+\.\S+$/.test(email)) { err.textContent = "Enter a valid email address."; err.hidden = false; return; }
      if (mode === "signup" && !passwordChecks(pw.value).every((c) => c.ok)) {
        err.textContent = "Your password does not meet all the rules yet."; err.hidden = false; return;
      }
      if (!pw.value) { err.textContent = "Enter your password."; err.hidden = false; return; }
      btn.disabled = true; btn.textContent = "One moment...";
      try {
        const user = mode === "login" ? await backend.signIn(email, pw.value) : await backend.signUp(email, pw.value);
        onDone(user);
      } catch (ex) {
        err.textContent = ex.message; err.hidden = false;
        btn.disabled = false; btn.textContent = mode === "login" ? "Log in" : "Sign up";
      }
    };
  };
  draw();
}
