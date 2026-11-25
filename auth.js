import { onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  doc, getDoc, setDoc, updateDoc, serverTimestamp, writeBatch, collection, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from "./fb.js";
import { configured, compressSquare, upload } from "./cloud.js";
import { DISTRICTS } from "./districts.js";
import { verifiedTick } from "./listings.js";

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

async function run(form, fn) {
  const btn = form.querySelector("button[type=submit]");
  btn.disabled = true; btn.classList.add("loading");
  clearMsg();
  try { await fn(); } catch (e) { show(friendly(e), false); }
  btn.disabled = false; btn.classList.remove("loading");
}

$("btn-logout").addEventListener("click", async () => { await signOut(auth); });

// ---- Profile
const STATUS = {
  unverified: "Not verified yet. Submit your student details to start posting.",
  pending: "Your request is pending review.",
  verified: "You are a verified student and can post listings.",
  rejected: "Your last request was not approved. You can submit again."
};
const BADGE = { unverified: "Not verified", pending: "Pending review", verified: "\u2713 Verified student", rejected: "Not approved" };
const me = { uid: "", verified: false, photo: "", name: "", pending: "" };
const NONE = "Not added yet";

function cachePhoto(uid, url) {
  try { if (url) localStorage.setItem("hb-photo", JSON.stringify({ uid, url })); else localStorage.removeItem("hb-photo"); } catch (e) { /* ignore */ }
}
function cachedPhoto(uid) {
  try {
    const v = JSON.parse(localStorage.getItem("hb-photo") || "null");
    return v && v.uid === uid && /^https:\/\/res\.cloudinary\.com\//.test(v.url) ? v.url : "";
  } catch (e) { return ""; }
}
async function safeGet(ref) { try { return await getDoc(ref); } catch (e) { return null; } }

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

function paintAvatar(box, photo, name) {
  box.replaceChildren();
  if (photo) {
    const im = document.createElement("img");
    im.src = photo; im.alt = ""; im.referrerPolicy = "no-referrer";
    box.append(im);
  } else { box.textContent = (name || "S").trim().charAt(0).toUpperCase(); }
}
function setName(name) {
  const h = $("acc-name");
  h.textContent = name || "Student";
  if (me.verified) h.append(verifiedTick());
}
function fillIdentity(user, name) {
  me.name = name || "Student";
  setName(me.name);
  $("acc-email").textContent = user.email || "";
  paintAvatar($("acc-avatar"), me.photo || user.photoURL || "", me.name);
}

function renderInfo(d) {
  $("info-dept").textContent = d.department || NONE;
  $("info-session").textContent = d.session || NONE;
  $("info-home").textContent = d.hometown || NONE;
  $("info-id").textContent = d.studentId || NONE;
  $("info-perm").textContent = d.permanent || NONE;
  $("info-pres").textContent = d.present || NONE;
  $("info-bio").textContent = d.bio || "Add a short bio";
  $("priv-note").textContent = d.visible
    ? "Your addresses are visible on your public profile. Your student ID is shown only to verified students."
    : "Your student ID is shown only to verified students. Your addresses stay private unless you choose to share them.";
}

function fillForm(d) {
  $("ed-name").value = d.displayName || "";
  $("ed-dept").value = d.department || "";
  $("ed-session").value = d.session || "";
  $("ed-home").value = d.hometown || "";
  $("ed-bio").value = d.bio || "";
  $("c-bio").textContent = $("ed-bio").value.length + "/160";
  $("ed-perm").value = d.permanent || "";
  $("ed-pres").value = d.present || "";
  $("ed-share").checked = !!d.visible;
  paintAvatar($("ed-avatar"), me.photo, d.displayName);
}

let data = {}; // what the page currently shows

async function loadProfile(user) {
  const uref = doc(db, "users", user.uid);
  let snap;
  try {
    snap = await getDoc(uref);
    if (!snap.exists()) {
      await setDoc(uref, {
        displayName: (user.displayName || "Student").slice(0, 80),
        email: user.email || "", campusId: "cu", role: "student",
        verificationStatus: "unverified", createdAt: serverTimestamp()
      });
      snap = await getDoc(uref);
    }
  } catch (e) {
    show("Could not load your profile. Please reload the page.", false);
    return;
  }
  const u = snap.data();
  me.uid = user.uid;
  me.verified = u.verificationStatus === "verified";
  renderVerification(u.verificationStatus);
  $("pub-link").href = "profile.html?uid=" + encodeURIComponent(user.uid);
  if (u.createdAt && u.createdAt.toDate) {
    $("st-since").textContent = u.createdAt.toDate().toLocaleDateString("en-GB", { month: "short", year: "numeric" });
  }

  const pubRef = doc(db, "publicProfiles", user.uid);
  const [pub, addr, sp, sid] = await Promise.all([
    safeGet(pubRef), safeGet(doc(db, "addresses", user.uid)),
    safeGet(doc(db, "studentProfiles", user.uid)), safeGet(doc(db, "studentIds", user.uid))
  ]);
  const p = pub && pub.exists() ? pub.data() : {};
  const a = addr && addr.exists() ? addr.data() : {};
  const s = sp && sp.exists() ? sp.data() : {};

  // Keep the public record in step with the account (verified flag can only be set to the true value)
  const name = p.displayName || u.displayName || user.displayName || "Student";
  try {
    if (!pub || !pub.exists() || p.verified !== me.verified) {
      await setDoc(pubRef, { displayName: name.slice(0, 80), verified: me.verified }, { merge: true });
    }
  } catch (e) { /* shown next time */ }
  try {
    if (me.verified && s.studentId && !(sid && sid.exists())) await setDoc(doc(db, "studentIds", user.uid), { studentId: s.studentId });
  } catch (e) { /* admin approval also writes this */ }

  me.photo = p.photo || "";
  cachePhoto(user.uid, me.photo);
  data = {
    displayName: name, photo: me.photo, bio: p.bio || u.bio || "",
    department: p.department || s.department || "", session: p.session || "", hometown: p.hometown || "",
    studentId: (sid && sid.exists() && sid.data().studentId) || s.studentId || "",
    permanent: a.permanent || "", present: a.present || "", visible: !!a.visible
  };
  fillIdentity(user, name);
  renderInfo(data);
  fillForm(data);
  loadExtras(user);
}

async function loadExtras(user) {
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
DISTRICTS.forEach((d) => { const o = document.createElement("option"); o.value = d; o.textContent = d; $("ed-home").append(o); });
$("photo-note").textContent = configured ? "Your photo is cropped to a square and resized on your phone." : "Photo upload is not set up yet.";
if (!configured) $("ed-photo").disabled = true;

$("btn-edit").addEventListener("click", () => { fillForm(data); $("form-edit").hidden = false; $("btn-edit").hidden = true; $("ed-name").focus(); });
$("btn-edit-cancel").addEventListener("click", () => { me.photo = data.photo; $("form-edit").hidden = true; $("btn-edit").hidden = false; });
$("ed-bio").addEventListener("input", () => { $("c-bio").textContent = $("ed-bio").value.length + "/160"; });

$("ed-photo").addEventListener("change", async () => {
  const f = $("ed-photo").files[0];
  $("ed-photo").value = "";
  if (!f || !f.type.startsWith("image/") || f.size > 15 * 1024 * 1024) { show("Please choose an image under 15 MB.", false); return; }
  $("photo-note").textContent = "Uploading photo...";
  try {
    me.photo = await upload(await compressSquare(f, 512));
    paintAvatar($("ed-avatar"), me.photo, $("ed-name").value);
    $("photo-note").textContent = "Photo ready. Tap Save to keep it.";
  } catch (e) { $("photo-note").textContent = "Upload failed. Please try again."; }
});
$("btn-photo-remove").addEventListener("click", () => { me.photo = ""; paintAvatar($("ed-avatar"), "", $("ed-name").value); $("photo-note").textContent = "Photo removed. Tap Save to keep this."; });

$("form-edit").addEventListener("submit", (ev) => {
  ev.preventDefault();
  run(ev.target, async () => {
    const d = {
      displayName: $("ed-name").value.trim(), department: $("ed-dept").value.trim(), session: $("ed-session").value.trim(),
      hometown: $("ed-home").value, bio: $("ed-bio").value.trim(),
      permanent: $("ed-perm").value.trim(), present: $("ed-pres").value.trim(), visible: $("ed-share").checked
    };
    if (d.displayName.length < 2 || d.displayName.length > 80) { show("Name must be 2 to 80 characters.", false); return; }
    if (d.department.length > 80) { show("Department is too long.", false); return; }
    if (d.session.length > 20) { show("Session is too long.", false); return; }
    if (d.hometown && !DISTRICTS.includes(d.hometown)) { show("Please choose a district from the list.", false); return; }
    if (d.bio.length > 160) { show("About me can be up to 160 characters.", false); return; }
    if (d.permanent.length > 200 || d.present.length > 200) { show("Addresses can be up to 200 characters.", false); return; }
    const uid = auth.currentUser.uid;
    await setDoc(doc(db, "publicProfiles", uid), {
      displayName: d.displayName, photo: me.photo || "", bio: d.bio, department: d.department,
      session: d.session, hometown: d.hometown, verified: me.verified
    }, { merge: true });
    await setDoc(doc(db, "addresses", uid), { permanent: d.permanent, present: d.present, visible: d.visible });
    await updateDoc(doc(db, "users", uid), { displayName: d.displayName });
    try { await updateProfile(auth.currentUser, { displayName: d.displayName }); } catch (e) { /* non-fatal */ }
    data = { ...data, ...d, photo: me.photo };
    cachePhoto(uid, me.photo);
    fillIdentity(auth.currentUser, d.displayName);
    renderInfo(data);
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
    data.department = data.department || dept; data.studentId = sid; $("info-dept").textContent = data.department; $("info-id").textContent = sid;
    toast("Request sent for review");
  });
});

// ---- Auth state
let authReady = false;
function ready() { authReady = true; $("auth-loading").hidden = true; }
const goLogin = () => location.replace("login.html?next=auth.html");
setTimeout(() => { if (!authReady) goLogin(); }, 10000);

onAuthStateChanged(auth, (user) => {
  if (!user) { goLogin(); return; }
  ready();
  $("account").hidden = false;
  $("hero-user").hidden = false;
  me.photo = cachedPhoto(user.uid);
  fillIdentity(user, user.displayName);
  loadProfile(user);
});
