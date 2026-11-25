import {
  onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail,
  updateProfile, sendEmailVerification, GoogleAuthProvider, signInWithPopup,
  setPersistence, browserLocalPersistence, browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth } from "./fb.js";

const $ = (id) => document.getElementById(id);
const msg = $("msg");
let registering = false;

function show(text, ok) {
  if (text && window.HBFx) { if (ok) window.HBFx.success(); else window.HBFx.error(); }
  msg.textContent = text; msg.className = text ? "gl-msg " + (ok ? "ok" : "err") : "gl-msg";
}
function clearMsg() { msg.textContent = ""; msg.className = "gl-msg"; }

const ERR = {
  "auth/invalid-credential": "Wrong email or password.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/email-already-in-use": "An account with this email already exists.",
  "auth/weak-password": "Password is too weak. Use at least 8 characters.",
  "auth/too-many-requests": "Too many attempts. Please wait a few minutes and try again.",
  "auth/network-request-failed": "Network problem. Check your internet and try again.",
  "auth/invalid-api-key": "Setup problem (API key). Please tell the site owner.",
  "auth/operation-not-allowed": "Email sign-in is not enabled yet. Use Google for now.",
  "auth/popup-closed-by-user": "Sign-in was cancelled.",
  "auth/cancelled-popup-request": "Sign-in was cancelled.",
  "auth/popup-blocked": "Your browser blocked the sign-in window. Allow pop-ups for this site and try again.",
  "auth/unauthorized-domain": "This website address is not authorised in Firebase yet. Please tell the site owner.",
  "auth/account-exists-with-different-credential": "An account with this email already exists with another sign-in method."
};
const friendly = (e) => ERR[e && e.code] || "Something went wrong. Please try again.";

// ---- Modes: login / register / reset
const MODES = {
  login: ["Login", "Welcome back, please sign in"],
  register: ["Create account", "Join students at the University of Chittagong"],
  reset: ["Reset password", "We will email you a reset link"]
};
const forms = { login: $("form-login"), register: $("form-register"), reset: $("form-reset") };
function setMode(m) {
  clearMsg();
  Object.keys(forms).forEach((k) => { forms[k].hidden = k !== m; });
  $("gl-title").textContent = MODES[m][0];
  $("gl-sub").textContent = MODES[m][1];
  document.querySelectorAll(".gl-switch").forEach((p) => { p.hidden = !p.dataset.for.split(" ").includes(m); });
}
document.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));

// ---- Show / hide password
document.querySelectorAll("[data-eye]").forEach((b) => b.addEventListener("click", () => {
  const input = $(b.dataset.eye);
  const show = input.type === "password";
  input.type = show ? "text" : "password";
  b.setAttribute("aria-pressed", String(show));
  b.setAttribute("aria-label", show ? "Hide password" : "Show password");
}));

// ---- Remember me: stay signed in on this device, or only for this browser session
async function applyRemember() {
  try { await setPersistence(auth, $("remember").checked ? browserLocalPersistence : browserSessionPersistence); } catch (e) { /* default */ }
}

async function run(form, fn) {
  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true; btn.classList.add("loading");
  clearMsg();
  try { await fn(); } catch (e) { show(friendly(e), false); }
  btn.disabled = false; btn.classList.remove("loading");
}

forms.login.addEventListener("submit", (ev) => {
  ev.preventDefault();
  run(ev.target, async () => {
    await applyRemember();
    await signInWithEmailAndPassword(auth, $("login-email").value.trim(), $("login-password").value);
  });
});

forms.register.addEventListener("submit", (ev) => {
  ev.preventDefault();
  run(ev.target, async () => {
    const name = $("reg-name").value.trim(), pw = $("reg-password").value;
    if (name.length < 2) { show("Please enter your full name.", false); return; }
    if (pw.length < 8) throw { code: "auth/weak-password" };
    if (pw !== $("reg-password2").value) { show("Passwords do not match.", false); return; }
    registering = true; // wait for the name to be saved before leaving this page
    try {
      await applyRemember();
      const cred = await createUserWithEmailAndPassword(auth, $("reg-email").value.trim(), pw);
      await updateProfile(cred.user, { displayName: name });
      try { await sendEmailVerification(cred.user); } catch (e) { /* non-fatal */ }
    } finally { registering = false; }
    go();
  });
});

forms.reset.addEventListener("submit", (ev) => {
  ev.preventDefault();
  run(ev.target, async () => {
    await sendPasswordResetEmail(auth, $("reset-email").value.trim());
    show("If an account exists for that email, a reset link has been sent.", true);
  });
});

$("btn-google").addEventListener("click", async (ev) => {
  const btn = ev.currentTarget;
  btn.disabled = true; btn.classList.add("loading"); clearMsg();
  try { await applyRemember(); await signInWithPopup(auth, new GoogleAuthProvider()); }
  catch (e) { show(friendly(e), false); }
  btn.disabled = false; btn.classList.remove("loading");
});

// ---- Leave this page once signed in (only to a page on this site)
function go() {
  const n = new URLSearchParams(location.search).get("next") || "";
  location.replace(/^[a-z0-9-]+\.html(\?[\w=&%.-]*)?$/i.test(n) ? n : "auth.html");
}

let resolved = false;
function showCard() { resolved = true; $("gl-loading").hidden = true; $("gl-card").hidden = false; }
setTimeout(() => { if (!resolved) showCard(); }, 8000);
onAuthStateChanged(auth, (user) => {
  if (user && !registering) { go(); return; }
  if (!user) showCard();
});
