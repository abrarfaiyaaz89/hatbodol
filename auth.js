import {
  onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, sendPasswordResetEmail, updateProfile, sendEmailVerification,
  GoogleAuthProvider, signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, getDoc, setDoc, updateDoc, serverTimestamp, writeBatch, collection, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from "./fb.js";

const $ = (id) => document.getElementById(id);
const msg = $("msg");
const reduced = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
const toast = (t) => { if (window.HBToast) window.HBToast.show(t); };

function show(text, ok) {
  if (text && window.HBFx) { if (ok) window.HBFx.success(); else window.HBFx.error(); }
  msg.textContent = text; msg.className = text ? "msg " + (ok ? "ok" : "err") : "msg";
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
  "auth/operation-not-allowed": "This sign-in method is not enabled yet. Please tell the site owner.",
  "permission-denied": "You are not allowed to do that.",
  "auth/popup-closed-by-user": "Sign-in was cancelled.",
  "auth/cancelled-popup-request": "Sign-in was cancelled.",
  "auth/popup-blocked": "Your browser blocked the sign-in window. Allow pop-ups for this site and try again.",
  "auth/unauthorized-domain": "This website address is not authorised in Firebase yet. Please tell the site owner.",
  "auth/account-exists-with-different-credential": "An account with this email already exists with another sign-in method."
};
const friendly = (e) => ERR[e && e.code] || "Something went wrong. Please try again.";

// ---- Tabs with sliding highlight
const panels = { login: $("panel-login"), register: $("panel-register"), reset: $("panel-reset") };
const tabsBar = document.querySelector(".tabs");
function tab(name) {
  clearMsg();
  Object.keys(panels).forEach((k) => { panels[k].hidden = k !== name; });
  const hl = name === "register" ? "register" : "login";
  tabsBar.setAttribute("data-active", hl);
  document.querySelectorAll("[data-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === hl)));
}
document.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => tab(b.dataset.tab)));
document.querySelectorAll("[data-goto]").forEach((b) => b.addEventListener("click", () => tab(b.dataset.goto)));

async function run(form, fn) {
  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true; btn.classList.add("loading");
  clearMsg();
  try { await fn(); } catch (e) { show(friendly(e), false); }
  btn.disabled = false; btn.classList.remove("loading");
}

$("form-login").addEventListener("submit", (ev) => {
  ev.preventDefault();
  run(ev.target, async () => {
    await signInWithEmailAndPassword(auth, $("login-email").value.trim(), $("login-password").value);
    toast("Welcome back");
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

$("btn-google").addEventListener("click", async (ev) => {
  const btn = ev.currentTarget;
  btn.disabled = true; btn.classList.add("loading"); clearMsg();
  try { await signInWithPopup(auth, new GoogleAuthProvider()); toast("Signed in"); }
  catch (e) { show(friendly(e), false); }
  btn.disabled = false; btn.classList.remove("loading");
});

$("btn-logout").addEventListener("click", async () => { await signOut(auth); clearMsg(); toast("Logged out"); });

// ---- Profile
const STATUS = {
  unverified: "Not verified yet. Submit your student details to start posting.",
  pending: "Your request is pending review.",
  verified: "You are a verified student and can post listings.",
  rejected: "Your last request was not approved. You can submit again."
};
const BADGE = { unverified: "Not verified", pending: "Pending review", verified: "\u2713 Verified student", rejected: "Not approved" };

function renderVerification(status) {
  const s = STATUS[status] ? status : "unverified";
  $("ver-status").textContent = STATUS[s];
  $("form-verify").hidden = !(s === "unverified" || s === "rejected");
  const b = $("ver-badge");
  b.textContent = BADGE[s]; b.className = "vbadge " + s;
}

function countUp(el, n) {
  if (reduced || n === 0) { el.textContent = String(n); return; }
  const t0 = performance.now();
  (function step(t) {
    const p = Math.min(1, (t - t0) / 700);
    el.textContent = String(Math.round(n * (1 - Math.pow(1 - p, 3))));
    if (p < 1) requestAnimationFrame(step);
  })(t0);
}
const maskId = (s) => (s.length <= 3 ? s : "\u2022".repeat(s.length - 3) + s.slice(-3));
const setBio = (bio) => { $("info-bio").textContent = bio || "Add a short bio"; };

function fillIdentity(user, name) {
  $("acc-name").textContent = name || "Student";
  $("acc-email").textContent = user.email || "";
  const av = $("acc-avatar");
  av.replaceChildren();
  if (user.photoURL) {
    const im = document.createElement("img");
    im.src = user.photoURL; im.alt = ""; im.referrerPolicy = "no-referrer";
    av.append(im);
  } else { av.textContent = (name || user.email || "S").trim().charAt(0).toUpperCase(); }
}

async function loadProfile(user) {
  const ref = doc(db, "users", user.uid);
  try {
    let snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        displayName: (user.displayName || "Student").slice(0, 80),
        email: user.email || "", campusId: "cu", role: "student",
        verificationStatus: "unverified", createdAt: serverTimestamp()
      });
      snap = await getDoc(ref);
    }
    const u = snap.data();
    renderVerification(u.verificationStatus);
    fillIdentity(user, u.displayName || user.displayName);
    setBio(u.bio);
    $("ed-name").value = u.displayName || "";
    $("ed-bio").value = u.bio || "";
    $("c-bio").textContent = ($("ed-bio").value.length) + "/160";
    if (u.createdAt && u.createdAt.toDate) {
      $("st-since").textContent = u.createdAt.toDate().toLocaleDateString("en-GB", { month: "short", year: "numeric" });
    }
  } catch (e) {
    show("Could not load your profile. Please reload the page.", false);
    return;
  }
  loadExtras(user);
}

async function loadExtras(user) {
  try {
    const sp = await getDoc(doc(db, "studentProfiles", user.uid));
    if (sp.exists()) {
      const d = sp.data();
      $("info-dept").textContent = d.department || "Not added yet";
      $("info-id").textContent = d.studentId ? maskId(d.studentId) : "Not added yet";
    }
  } catch (e) { /* optional */ }
  try {
    const ls = await getDocs(query(collection(db, "listings"), where("ownerId", "==", user.uid)));
    let a = 0, s = 0;
    ls.forEach((d) => { const st = d.data().status; if (st === "active") a++; else if (st === "sold") s++; });
    countUp($("st-active"), a); countUp($("st-sold"), s);
  } catch (e) { /* optional */ }
  const box = $("admin-link");
  try {
    const a = await getDoc(doc(db, "admins", user.uid));
    if (a.exists()) {
      let n = 0;
      try { n = (await getDocs(query(collection(db, "users"), where("verificationStatus", "==", "pending")))).size; } catch (e) { /* optional */ }
      box.hidden = false;
      box.querySelector("a").textContent = "Admin: review requests" + (n ? " (" + n + " pending)" : "");
    } else { box.hidden = true; }
  } catch (e) { box.hidden = true; }
}

// ---- Edit profile
$("btn-edit").addEventListener("click", () => { $("form-edit").hidden = false; $("btn-edit").hidden = true; $("ed-name").focus(); });
$("btn-edit-cancel").addEventListener("click", () => { $("form-edit").hidden = true; $("btn-edit").hidden = false; });
$("ed-bio").addEventListener("input", () => { $("c-bio").textContent = $("ed-bio").value.length + "/160"; });
$("form-edit").addEventListener("submit", (ev) => {
  ev.preventDefault();
  run(ev.target, async () => {
    const name = $("ed-name").value.trim(), bio = $("ed-bio").value.trim();
    if (name.length < 2 || name.length > 80) { show("Name must be 2 to 80 characters.", false); return; }
    if (bio.length > 160) { show("About me can be up to 160 characters.", false); return; }
    await updateDoc(doc(db, "users", auth.currentUser.uid), { displayName: name, bio });
    try { await updateProfile(auth.currentUser, { displayName: name }); } catch (e) { /* non-fatal */ }
    fillIdentity(auth.currentUser, name); setBio(bio);
    $("form-edit").hidden = true; $("btn-edit").hidden = false;
    toast("Profile saved");
  });
});

// ---- Verification request
$("form-verify").addEventListener("submit", (ev) => {
  ev.preventDefault();
  run(ev.target, async () => {
    const sid = $("ver-id").value.trim(), dept = $("ver-dept").value.trim(), mail = $("ver-mail").value.trim();
    if (sid.length < 6 || sid.length > 20) { show("Enter your student ID (6 to 20 characters).", false); return; }
    if (dept.length < 2) { show("Enter your department.", false); return; }
    const uid = auth.currentUser.uid;
    const batch = writeBatch(db);
    batch.set(doc(db, "studentProfiles", uid), { studentId: sid, department: dept, universityEmail: mail, submittedAt: serverTimestamp() });
    batch.update(doc(db, "users", uid), { verificationStatus: "pending" });
    await batch.commit();
    renderVerification("pending");
    $("info-dept").textContent = dept; $("info-id").textContent = maskId(sid);
    toast("Request sent for review");
  });
});

// ---- Auth state
let authReady = false;
function ready() { authReady = true; $("auth-loading").hidden = true; }
setTimeout(() => { if (!authReady) { ready(); $("auth-forms").hidden = false; $("hero-guest").hidden = false; } }, 8000);

onAuthStateChanged(auth, (user) => {
  ready();
  const signedIn = !!user;
  $("auth-forms").hidden = signedIn;
  $("account").hidden = !signedIn;
  $("hero-guest").hidden = signedIn;
  $("hero-user").hidden = !signedIn;
  if (!signedIn) { $("admin-link").hidden = true; return; }
  fillIdentity(user, user.displayName);
  loadProfile(user);
});
