import { collection, query, where, orderBy, limit, startAfter, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./fb.js";
import { CATEGORIES, renderCard, el } from "./listings.js";

const PAGE = 12;
const $ = (id) => document.getElementById(id);
const grid = $("grid"), note = $("note"), moreBtn = $("more"), chips = $("chips"), qInput = $("q");
let all = [], last = null, done = false, cat = "All", q = "";

function setNote(text, err) { note.textContent = text; note.className = text ? "msg " + (err ? "err" : "ok") : "msg"; }

function matches(l) {
  if (cat !== "All" && l.category !== cat) return false;
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = (l.title + " " + (l.description || "") + " " + l.category).toLowerCase();
  return words.every((w) => hay.includes(w));
}

function render() {
  const shown = all.filter(matches);
  grid.replaceChildren(...shown.map(renderCard));
  if (!shown.length) {
    setNote(all.length ? "No matches in the loaded listings. Try Load more." : "No listings yet. Be the first to post.", false);
    if (!all.length) note.className = "msg";
  } else { setNote("", false); }
  moreBtn.hidden = done;
}

async function loadPage() {
  moreBtn.disabled = true;
  try {
    const c = [where("status", "==", "active"), orderBy("createdAt", "desc")];
    if (last) c.push(startAfter(last));
    c.push(limit(PAGE));
    const snap = await getDocs(query(collection(db, "listings"), ...c));
    snap.docs.forEach((d) => all.push(d.data()));
    if (snap.docs.length) last = snap.docs[snap.docs.length - 1];
    if (snap.size < PAGE) done = true;
    render();
  } catch (e) {
    if (e && e.code === "failed-precondition") {
      const m = /https:\/\/\S+/.exec(e.message || "");
      note.className = "msg err";
      note.textContent = "One-time setup needed: create the listings index. ";
      if (m) { const a = el("a", "Tap here to create it", "link"); a.href = m[0]; a.target = "_blank"; a.rel = "noopener"; note.append(a); }
    } else { setNote("Could not load listings. Please reload the page.", true); }
  }
  moreBtn.disabled = false;
}

function buildChips() {
  ["All", ...CATEGORIES].forEach((name) => {
    const b = el("button", name, "chip");
    b.type = "button";
    b.setAttribute("aria-pressed", String(name === cat));
    b.addEventListener("click", () => {
      cat = name;
      chips.querySelectorAll(".chip").forEach((x) => x.setAttribute("aria-pressed", String(x.textContent === cat)));
      render();
    });
    chips.append(b);
  });
}

q = (new URLSearchParams(location.search).get("q") || "").slice(0, 80);
qInput.value = q;
qInput.addEventListener("input", () => { q = qInput.value.slice(0, 80); render(); });
moreBtn.addEventListener("click", loadPage);
buildChips();
loadPage();
