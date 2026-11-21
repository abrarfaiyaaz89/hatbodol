import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, addDoc, updateDoc, deleteDoc, collection, query, where, getDocs, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from "./fb.js";
import { CLOUD_NAME, UPLOAD_PRESET } from "./cloudinary-config.js";
import { CATEGORIES, el, keywords, renderCard } from "./listings.js";

const $ = (id) => document.getElementById(id);
const msg = $("msg"), form = $("form-post");
const photosConfigured = CLOUD_NAME && !CLOUD_NAME.startsWith("YOUR_");
let currentUser = null, ownerName = "Student";

function show(text, ok) {
  if (text && window.HBFx) { if (ok) window.HBFx.success(); else window.HBFx.error(); }
  msg.textContent = text; msg.className = text ? "msg " + (ok ? "ok" : "err") : "msg";
}
function gate(text, href, linkText) {
  const g = $("gate");
  g.replaceChildren(document.createTextNode(text + " "));
  if (href) { const a = el("a", linkText, "link"); a.href = href; g.append(a); }
  g.hidden = false;
}

CATEGORIES.forEach((c) => { const o = el("option", c); o.value = c; $("p-category").append(o); });
$("p-type").addEventListener("change", () => { $("price-wrap").hidden = $("p-type").value === "exchange"; });
$("photo-note").textContent = photosConfigured
  ? "Photos are resized on your phone before upload."
  : "Photo upload is not set up yet, so listings are posted without photos.";
if (!photosConfigured) $("p-photos").disabled = true;

// Previews
$("p-photos").addEventListener("change", () => {
  const prev = $("preview"); prev.replaceChildren();
  Array.from($("p-photos").files).slice(0, 3).forEach((f) => {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(f); img.alt = "Selected photo";
    img.onload = () => URL.revokeObjectURL(img.src);
    prev.append(img);
  });
});

function loadImg(file) {
  return new Promise((res, rej) => {
    const u = URL.createObjectURL(file), i = new Image();
    i.onload = () => { URL.revokeObjectURL(u); res(i); };
    i.onerror = () => { URL.revokeObjectURL(u); rej(new Error("bad image")); };
    i.src = u;
  });
}
async function compress(file) {
  const img = await loadImg(file);
  const s = Math.min(1, 1280 / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("compress"))), "image/jpeg", 0.8));
}
async function upload(blob) {
  const fd = new FormData();
  fd.append("file", blob); fd.append("upload_preset", UPLOAD_PRESET);
  const r = await fetch("https://api.cloudinary.com/v1_1/" + CLOUD_NAME + "/image/upload", { method: "POST", body: fd });
  if (!r.ok) throw new Error("upload");
  return (await r.json()).secure_url;
}

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  const btn = form.querySelector("button[type=submit]");
  const type = $("p-type").value, title = $("p-title").value.trim(), desc = $("p-desc").value.trim();
  const price = type === "exchange" ? 0 : Number($("p-price").value);
  if (title.length < 3) { show("Please enter a title (at least 3 characters).", false); return; }
  if (type === "sell" && (!isFinite(price) || price < 0 || $("p-price").value === "")) { show("Please enter a valid price.", false); return; }
  const files = Array.from($("p-photos").files).slice(0, 3);
  btn.disabled = true; btn.textContent = "Publishing...";
  show("", true);
  try {
    const images = [];
    for (const f of files) images.push(await upload(await compress(f)));
    await addDoc(collection(db, "listings"), {
      type, title, description: desc, category: $("p-category").value, condition: $("p-condition").value,
      price, images, titleKeywords: keywords(title), ownerId: currentUser.uid, ownerName,
      campusId: "cu", status: "active", createdAt: serverTimestamp()
    });
    form.reset(); $("preview").replaceChildren(); $("price-wrap").hidden = false;
    show("Your listing is live.", true);
    loadMine();
  } catch (e) {
    show(e && e.code === "permission-denied" ? "You are not allowed to post yet. Check your verification." : "Could not publish. Please check your internet and try again.", false);
  }
  btn.disabled = false; btn.textContent = "Publish listing";
});

async function loadMine() {
  const box = $("mine"); box.replaceChildren();
  try {
    const snap = await getDocs(query(collection(db, "listings"), where("ownerId", "==", currentUser.uid)));
    const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.createdAt ? b.createdAt.seconds : 0) - (a.createdAt ? a.createdAt.seconds : 0));
    $("mine-title").hidden = !rows.length;
    rows.forEach((l) => {
      const wrap = el("div", undefined, "mine-item");
      wrap.append(renderCard(l));
      wrap.append(el("div", l.status === "active" ? "Status: available" : l.status === "sold" ? "Status: sold" : "Status: hidden by admin", "lmeta"));
      const row = el("div", undefined, "row");
      if (l.status !== "hidden") {
        const t = el("button", l.status === "active" ? "Mark sold" : "Mark available", "btn btn-small"); t.type = "button";
        t.addEventListener("click", async () => {
          t.disabled = true;
          try { await updateDoc(doc(db, "listings", l.id), { status: l.status === "active" ? "sold" : "active" }); loadMine(); }
          catch (e) { show("Could not update. Please try again.", false); t.disabled = false; }
        });
        row.append(t);
      }
      const d = el("button", "Delete", "btn btn-small btn-light"); d.type = "button";
      d.addEventListener("click", async () => {
        if (!confirm("Delete this listing?")) return;
        d.disabled = true;
        try { await deleteDoc(doc(db, "listings", l.id)); loadMine(); }
        catch (e) { show("Could not delete. Please try again.", false); d.disabled = false; }
      });
      row.append(d); wrap.append(row); box.append(wrap);
    });
  } catch (e) { show("Could not load your listings.", false); }
}

onAuthStateChanged(auth, async (user) => {
  currentUser = user; form.hidden = true;
  if (!user) { gate("Please log in to post a listing.", "auth.html", "Go to login"); return; }
  try {
    const s = await getDoc(doc(db, "users", user.uid));
    const st = s.exists() ? s.data().verificationStatus : "unverified";
    ownerName = (s.exists() && s.data().displayName) || user.displayName || "Student";
    if (st === "verified") { $("gate").hidden = true; form.hidden = false; loadMine(); }
    else if (st === "pending") gate("Your student verification is pending review. You can post once it is approved.");
    else gate("Only verified students can post. Please submit your student details first.", "auth.html", "Open my account");
  } catch (e) { gate("Could not check your account. Please reload the page."); }
});
