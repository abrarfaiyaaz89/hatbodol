import {
  onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, sendPasswordResetEmail, updateProfile, sendEmailVerification,
  GoogleAuthProvider, signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc, serverTimestamp, writeBatch, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from "./fb.js";

const $ = (id) => document.getElementById(id);
const msg = $("msg");

function show(text, ok) {
  if (text && window.HBFx) { if (ok) window.HBFx.success(); else window.HBFx.error(); }
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
  "auth/operation-not-allowed": "This sign-in method is not enabled yet. Please tell the site owner.",
  "permission-denied": "You are not allowed to do that.",
  "auth/popup-closed-by-user": "Sign-in was cancelled.",
  "auth/cancelled-popup-request": "Sign-in was cancelled.",
  "auth/popup-blocked": "Your browser blocked the sign-in window. Allow pop-ups for this site and try again.",
  "auth/unauthorized-domain": "This website address is not authorised in Firebase yet. Please tell the site owner.",
  "auth/account-exists-with-different-credential": "An account with this email already exists with another sign-in method."
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

$("btn-google").addEventListener("click", async (ev) => {
  const btn = ev.currentTarget;
  btn.disabled = true; clearMsg();
  try { await signInWithPopup(auth, new GoogleAuthProvider()); }
  catch (e) { show(friendly(e), false); }
  btn.disabled = false;
});

$("btn-logout").addEventListener("click", async () => { await signOut(auth); clearMsg(); });

const STATUS = {
  unverified: "Not verified yet. Submit your student details to start posting.",
  pending: "Your request is pending review.",
  verified: "Verified student.",
  rejected: "Your last request was not approved. You can submit again."
};
function renderVerification(status) {
  $("ver-status").textContent = STATUS[status] || STATUS.unverified;
  $("form-verify").hidden = !(status === "unverified" || status === "rejected");
}

function adminLink(show, n) {
  const box = $("admin-link");
  if (!box) return;
  box.hidden = !show;
  const a = box.querySelector("a");
  if (a && show) a.textContent = "Admin: review requests" + (n ? " (" + n + " pending)" : "");
}

async function loadProfile(user) {
  const ref = doc(db, "users", user.uid);
  try {
    let snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        displayName: (user.displayName || "Student").slice(0, 80),
        email: user.email || "",
        campusId: "cu",
        role: "student",
        verificationStatus: "unverified",
        createdAt: serverTimestamp()
      });
      snap = await getDoc(ref);
    }
    renderVerification(snap.data().verificationStatus);
    try {
      const a = await getDoc(doc(db, "admins", user.uid));
      if (a.exists()) {
        let n = 0;
        try {
          n = (await getDocs(query(collection(db, "users"), where("verificationStatus", "==", "pending")))).size;
        } catch (e) { /* count is optional */ }
        adminLink(true, n);
      } else { adminLink(false, 0); }
    } catch (e) { adminLink(false, 0); }
  } catch (e) {
    show("Could not load your profile. Please reload the page.", false);
  }
}

$("form-verify").addEventListener("submit", (ev) => {
  ev.preventDefault();
  run(ev.target, async () => {
    const sid = $("ver-id").value.trim();
    const dept = $("ver-dept").value.trim();
    const mail = $("ver-mail").value.trim();
    if (sid.length < 6 || sid.length > 20) { show("Enter your student ID (6 to 20 characters).", false); return; }
    if (dept.length < 2) { show("Enter your department.", false); return; }
    const uid = auth.currentUser.uid;
    const batch = writeBatch(db);
    batch.set(doc(db, "studentProfiles", uid), {
      studentId: sid, department: dept, universityEmail: mail, submittedAt: serverTimestamp()
    });
    batch.update(doc(db, "users", uid), { verificationStatus: "pending" });
    await batch.commit();
    renderVerification("pending");
    show("Submitted. Your request will be reviewed.", true);
  });
});

let authReady = false;
function ready() { authReady = true; const l = $("auth-loading"); if (l) l.hidden = true; }
setTimeout(() => { // if Firebase is slow or blocked, still show the forms
  if (!authReady) { ready(); $("auth-forms").hidden = false; }
}, 8000);

onAuthStateChanged(auth, (user) => {
  const signedIn = !!user;
  ready();
  if (!signedIn) adminLink(false, 0);
  $("auth-forms").hidden = signedIn;
  $("account").hidden = !signedIn;
  if (user) {
    $("acc-name").textContent = user.displayName || "Student";
    $("acc-email").textContent = user.email || "";
    loadProfile(user);
  }
});
