import { collection, query, where, orderBy, limit, startAfter, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./fb.js";
import { CATEGORIES, renderCard, skeletonCards, el } from "./listings.js";

const PAGE = 12;
const $ = (id) => document.getElementById(id);
const grid = $("grid"), note = $("note"), count = $("count"), moreBtn = $("more"), chips = $("chips"), qInput = $("q"), sortSel = $("sort");
let all = [], last = null, done = false, cat = "All", q = "", sort = "new";

function setNote(text, err) { note.textContent = text; note.className = text ? "msg " + (err ? "err" : "ok") : "msg"; }

function matches(l) {
  if (cat !== "All" && l.category !== cat) return false;
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = (l.title + " " + (l.description || "") + " " + l.category).toLowerCase();
  return words.every((w) => hay.includes(w));
}
function pv(l, asc) { return l.type === "exchange" ? (asc ? 1e12 : -1) : l.price; }

function render() {
  const shown = all.filter(matches);
  if (sort === "low") shown.sort((a, b) => pv(a, true) - pv(b, true));
  if (sort === "high") shown.sort((a, b) => pv(b, false) - pv(a, false));
  grid.replaceChildren(...shown.map(renderCard));
  count.textContent = shown.length ? shown.length + (shown.length === 1 ? " listing" : " listings") + (done ? "" : " loaded so far") : "";
  if (!shown.length) {
    if (all.length) setNote("No matches yet. Try Load more or change the filters.", false);
    else { note.className = "msg"; note.textContent = ""; grid.replaceChildren(emptyState()); }
  } else { setNote("", false); }
  moreBtn.hidden = done;
}

function emptyState() {
  const d = el("div", undefined, "empty empty-wide");
  d.append(el("p", "No listings yet. Be the first student to post something."));
  const a = el("a", "Post a listing", "btn"); a.href = "post.html";
  d.append(a);
  return d;
}

async function loadPage() {
  moreBtn.disabled = true;
  try {
    const c = [where("status", "==", "active"), orderBy("createdAt", "desc")];
    if (last) c.push(startAfter(last));
    c.push(limit(PAGE));
    const snap = await getDocs(query(collection(db, "listings"), ...c));
    snap.docs.forEach((d) => all.push({ id: d.id, ...d.data() }));
    if (snap.docs.length) last = snap.docs[snap.docs.length - 1];
    if (snap.size < PAGE) done = true;
    render();
  } catch (e) {
    grid.replaceChildren();
    if (e && e.code === "failed-precondition") {
      const m = /https:\/\/\S+/.exec(e.message || "");
      note.className = "msg err";
      note.textContent = "One-time setup needed: create the listings index. ";
      if (m) { const a = el("a", "Tap here to create it", "link"); a.href = m[0]; a.target = "_blank"; a.rel = "noopener"; note.append(a); }
    } else {
      note.className = "msg err";
      note.textContent = "Could not load listings. ";
      const r = el("button", "Try again", "link"); r.type = "button";
      r.addEventListener("click", () => { grid.replaceChildren(...skeletonCards(8)); setNote("", false); loadPage(); });
      note.append(r);
    }
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
sortSel.addEventListener("change", () => { sort = sortSel.value; render(); });
moreBtn.addEventListener("click", loadPage);
buildChips();
grid.replaceChildren(...skeletonCards(8));
loadPage();
