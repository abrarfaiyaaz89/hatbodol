import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, sendPasswordResetEmail, updateProfile, sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const auth = getAuth(initializeApp(firebaseConfig));
const $ = (id) => document.getElementById(id);
const msg = $("msg");

function show(text, ok) {
  msg.textContent = text;
  msg.className = "msg " + (ok ? "ok" : "err");
}
function clearMsg() { msg.textContent = ""; msg.className = "msg"; }

const ERR = {
  "auth/invalid-credential": "Wrong email or password.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/email-already-in-use": "An account with this email already exists.",
  "auth/weak-password": "Password is too weak. Use at least 8 characters.",
  "auth/too-many-requests": "Too many attempts. Please wait a few minutes and try again.",
  "auth/network-request-failed": "Network problem. Check your internet and try again.",
  "auth/invalid-api-key": "Setup problem (API key). Please tell the site owner.",
  "auth/operation-not-allowed": "Email sign-in is not enabled yet. Please tell the site owner."
};
const friendly = (e) => ERR[e && e.code] || "Something went wrong. Please try again.";

// Tabs
const panels = { login: $("panel-login"), register: $("panel-register"), reset: $("panel-reset") };
function tab(name) {
  clearMsg();
  Object.keys(panels).forEach((k) => { panels[k].hidden = k !== name; });
  document.querySelectorAll("[data-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === name)));
}
document.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => tab(b.dataset.tab)));
document.querySelectorAll("[data-goto]").forEach((b) => b.addEventListener("click", () => tab(b.dataset.goto)));

async function run(form, fn) {
  const btn = form.querySelector("button[type=submit]");
  const label = btn.textContent;
  btn.disabled = true; btn.textContent = "Please wait...";
  clearMsg();
  try { await fn(); } catch (e) { show(friendly(e), false); }
  btn.disabled = false; btn.textContent = label;
}

$("form-login").addEventListener("submit", (ev) => {
  ev.preventDefault();
  run(ev.target, async () => {
    await signInWithEmailAndPassword(auth, $("login-email").value.trim(), $("login-password").value);
  });
});

$("form-register").addEventListener("submit", (ev) => {
  ev.preventDefault();
  run(ev.target, async () => {
    const name = $("reg-name").value.trim();
    const pw = $("reg-password").value;
    if (name.length < 2) { show("Please enter your full name.", false); return; }
    if (pw.length < 8) throw { code: "auth/weak-password" };
    if (pw !== $("reg-password2").value) { show("Passwords do not match.", false); return; }
    const cred = await createUserWithEmailAndPassword(auth, $("reg-email").value.trim(), pw);
    await updateProfile(cred.user, { displayName: name });
    try { await sendEmailVerification(cred.user); } catch (e) { /* non-fatal */ }
    show("Account created. We sent a verification email to " + cred.user.email + ".", true);
  });
});

$("form-reset").addEventListener("submit", (ev) => {
  ev.preventDefault();
  run(ev.target, async () => {
    await sendPasswordResetEmail(auth, $("reset-email").value.trim());
    show("If an account exists for that email, a reset link has been sent.", true);
  });
});

$("btn-logout").addEventListener("click", async () => { await signOut(auth); clearMsg(); });

onAuthStateChanged(auth, (user) => {
  const signedIn = !!user;
  $("auth-forms").hidden = signedIn;
  $("account").hidden = !signedIn;
  if (user) {
    $("acc-name").textContent = user.displayName || "Student";
    $("acc-email").textContent = user.email + (user.emailVerified ? " (email verified)" : " (email not verified yet)");
  }
});
