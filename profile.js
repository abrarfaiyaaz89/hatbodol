// Public profile page: profile.html?uid=...  (signed-in users only)
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc, collection, query, where, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from "./fb.js";
import { el, renderCard, verifiedTick } from "./listings.js";

const uid = (new URLSearchParams(location.search).get("uid") || "").slice(0, 128);
const ph = document.getElementById("ph"), ps = document.getElementById("ps");

const safeGet = async (ref) => { try { return await getDoc(ref); } catch (e) { return null; } };
const safeQuery = async (q) => { try { return await getDocs(q); } catch (e) { return null; } };
const stars = (n) => "\u2605".repeat(n) + "\u2606".repeat(5 - n);
const avg = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

function fail(text, linkText, href) {
  ph.replaceChildren(el("h1", "Profile"));
  const p = el("p", text + " ");
  if (href) { const a = el("a", linkText, "link"); a.href = href; p.append(a); }
  ps.replaceChildren(p);
}

function row(dt, dd) {
  const r = document.createElement("div");
  r.append(el("dt", dt), el("dd", dd));
  return r;
}

async function load(viewer) {
  const isMe = viewer.uid === uid;
  const [pubS, adminS, viewerAdminS, addrS, sidS, meS, revS, lisS] = await Promise.all([
    safeGet(doc(db, "publicProfiles", uid)),
    safeGet(doc(db, "admins", uid)),
    safeGet(doc(db, "admins", viewer.uid)),
    safeGet(doc(db, "addresses", uid)),
    safeGet(doc(db, "studentIds", uid)),
    safeGet(doc(db, "users", viewer.uid)),
    safeQuery(query(collection(db, "reviews"), where("targetId", "==", uid))),
    safeQuery(query(collection(db, "listings"), where("ownerId", "==", uid), where("status", "==", "active")))
  ]);
  if (!pubS || !pubS.exists()) { fail("This profile is not available."); return; }
  const p = pubS.data();
  const targetIsAdmin = !!(adminS && adminS.exists());
  const viewerIsAdmin = !!(viewerAdminS && viewerAdminS.exists());
  const viewerVerified = !!(meS && meS.exists() && meS.data().verificationStatus === "verified");

  document.title = (p.displayName || "Profile") + " - HATBODOL";

  // ----- Hero
  const av = el("div", undefined, "avatar big");
  if (p.photo) { const im = document.createElement("img"); im.src = p.photo; im.alt = ""; im.referrerPolicy = "no-referrer"; av.append(im); }
  else av.textContent = (p.displayName || "S").trim().charAt(0).toUpperCase();
  const h1 = el("h1", p.displayName || "Student");
  if (p.verified) h1.append(verifiedTick());
  const badges = el("div", undefined, "badge-row");
  if (p.verified) badges.append(el("span", "\u2713 Verified student", "vbadge verified"));
  if (targetIsAdmin) badges.append(el("span", "Admin", "vbadge admin"));
  const meta = [p.department, p.session].filter(Boolean).join(" \u00B7 ");
  ph.replaceChildren(av, h1, ...(meta ? [el("p", meta)] : []), badges);

  // ----- Reviews
  const reviews = [];
  if (revS) revS.forEach((d) => reviews.push({ id: d.id, ...d.data() }));
  reviews.sort((a, b) => (b.createdAt ? b.createdAt.seconds : 0) - (a.createdAt ? a.createdAt.seconds : 0));
  const seller = reviews.filter((r) => r.as === "seller").map((r) => r.rating);
  const buyer = reviews.filter((r) => r.as === "buyer").map((r) => r.rating);
  const all = reviews.map((r) => r.rating);

  const listings = [];
  if (lisS) lisS.forEach((d) => listings.push({ id: d.id, ...d.data() }));
  listings.sort((a, b) => (b.createdAt ? b.createdAt.seconds : 0) - (a.createdAt ? a.createdAt.seconds : 0));

  const parts = [];

  // Stats
  const stats = el("div", undefined, "stats");
  const stat = (v, l) => { const d = el("div", undefined, "stat"); d.append(el("strong", v), el("span", l)); return d; };
  if (!targetIsAdmin) stats.append(stat(all.length ? avg(all).toFixed(1) + " \u2605" : "-", "Rating"), stat(String(all.length), "Reviews"));
  stats.append(stat(String(listings.length), "Active listings"));
  if (targetIsAdmin) stats.classList.add("stats-2");
  parts.push(stats);

  if (p.bio) { parts.push(el("h2", "About", "sub"), el("p", p.bio)); }

  // Details
  const info = el("dl", undefined, "info");
  info.append(row("University", "University of Chittagong"));
  if (p.department) info.append(row("Department", p.department));
  if (p.session) info.append(row("Session", p.session));
  if (p.hometown) info.append(row("Hometown", p.hometown));
  const canSeeId = isMe || viewerIsAdmin || viewerVerified;
  if (canSeeId && sidS && sidS.exists()) info.append(row("Student ID", sidS.data().studentId));
  else if (p.verified && !canSeeId) info.append(row("Student ID", "Visible to verified students"));
  if (addrS && addrS.exists() && (isMe || viewerIsAdmin || addrS.data().visible)) {
    const a = addrS.data();
    if (a.permanent) info.append(row("Permanent address", a.permanent));
    if (a.present) info.append(row("Present address", a.present));
  }
  parts.push(el("h2", "Details", "sub"), info);

  // Ratings
  if (!targetIsAdmin) {
    parts.push(el("h2", "Ratings", "sub"));
    const sum = el("div", undefined, "rate-sum");
    const line = (label, arr) => {
      const d = el("div", undefined, "rate-line");
      d.append(el("span", label), el("span", arr.length ? stars(Math.round(avg(arr))) + " " + avg(arr).toFixed(1) + " (" + arr.length + ")" : "No ratings yet", "stars"));
      return d;
    };
    sum.append(line("As a seller", seller), line("As a buyer", buyer));
    parts.push(sum);

    const mine = reviews.find((r) => r.reviewerId === viewer.uid);
    const list = el("div", undefined, "reviews");
    reviews.slice(0, 10).forEach((r) => {
      const c = el("div", undefined, "review");
      const top = el("div", undefined, "review-top");
      top.append(el("span", stars(r.rating), "stars"), el("span", (r.reviewerName || "Student") + " \u00B7 as " + r.as, "lmeta"));
      c.append(top);
      if (r.text) c.append(el("p", r.text));
      if (r.reviewerId === viewer.uid || viewerIsAdmin) {
        const del = el("button", "Delete", "link"); del.type = "button";
        del.addEventListener("click", async () => {
          if (!confirm("Delete this review?")) return;
          try { await deleteDoc(doc(db, "reviews", r.id)); load(viewer); } catch (e) { if (window.HBToast) window.HBToast.show("Could not delete"); }
        });
        c.append(del);
      }
      list.append(c);
    });
    parts.push(list);

    if (!isMe && viewerVerified) parts.push(rateForm(viewer, mine, meS.data()));
    else if (!isMe && !viewerVerified) parts.push(el("p", "Only verified students can rate others.", "note"));
  }

  // Listings
  if (listings.length) {
    parts.push(el("h2", "Active listings", "sub"));
    const g = el("div", undefined, "lgrid");
    g.append(...listings.slice(0, 8).map(renderCard));
    parts.push(g);
  }

  ps.replaceChildren(...parts);
}

function rateForm(viewer, mine, meData) {
  const f = el("form", undefined, "rate-form");
  f.noValidate = true;
  f.append(el("h3", mine ? "Update your rating" : "Rate this student", "sub"));

  const pick = el("fieldset", undefined, "starpick");
  pick.append(el("legend", "Stars", "visually-hidden"));
  let value = mine ? mine.rating : 0;
  const labels = [];
  for (let i = 1; i <= 5; i++) {
    const inp = document.createElement("input");
    inp.type = "radio"; inp.name = "stars"; inp.id = "star" + i; inp.value = String(i);
    if (value === i) inp.checked = true;
    const lab = el("label", "\u2605"); lab.htmlFor = "star" + i; lab.title = i + " star" + (i > 1 ? "s" : "");
    labels.push(lab);
    inp.addEventListener("change", () => { value = i; paint(); });
    pick.append(inp, lab);
  }
  const paint = () => labels.forEach((l, i) => l.classList.toggle("on", i < value));
  paint();
  f.append(pick);

  const fld = el("div", undefined, "field");
  const lbl = el("label", "This person was my"); lbl.htmlFor = "rate-as";
  const sel = document.createElement("select"); sel.id = "rate-as";
  [["seller", "Seller"], ["buyer", "Buyer"]].forEach(([v, t]) => { const o = el("option", t); o.value = v; sel.append(o); });
  if (mine) sel.value = mine.as;
  fld.append(lbl, sel); f.append(fld);

  const f2 = el("div", undefined, "field");
  const l2 = el("label", "Comment (optional)"); l2.htmlFor = "rate-text";
  const ta = document.createElement("textarea"); ta.id = "rate-text"; ta.rows = 3; ta.maxLength = 300; ta.value = mine ? mine.text || "" : "";
  f2.append(l2, ta); f.append(f2);

  const msg = el("p", undefined, "msg");
  const btn = el("button", mine ? "Update rating" : "Submit rating", "btn"); btn.type = "submit";
  f.append(msg, btn);

  f.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (!value) { msg.className = "msg err"; msg.textContent = "Please choose 1 to 5 stars."; return; }
    btn.disabled = true; btn.classList.add("loading");
    try {
      const rid = viewer.uid + "_" + uid;
      if (mine) await updateDoc(doc(db, "reviews", rid), { rating: value, text: ta.value.trim(), as: sel.value });
      else await setDoc(doc(db, "reviews", rid), {
        reviewerId: viewer.uid, reviewerName: (meData.displayName || viewer.displayName || "Student").slice(0, 80),
        targetId: uid, as: sel.value, rating: value, text: ta.value.trim(), createdAt: serverTimestamp()
      });
      if (window.HBFx) window.HBFx.success();
      if (window.HBToast) window.HBToast.show("Thanks for rating");
      load(viewer);
    } catch (e) {
      msg.className = "msg err";
      msg.textContent = "Could not save your rating. Please try again.";
      btn.disabled = false; btn.classList.remove("loading");
    }
  });
  return f;
}

if (!uid) fail("Profile not found.");
else onAuthStateChanged(auth, (viewer) => {
  if (!viewer) { fail("Please log in to view student profiles.", "Go to login", "auth.html"); return; }
  load(viewer);
});
