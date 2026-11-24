import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./fb.js";
import { CONDITIONS, el, fit, priceText, verifiedTick } from "./listings.js";

const box = document.getElementById("detail");
const id = new URLSearchParams(location.search).get("id") || "";

function fail(text) { box.replaceChildren(el("p", text, "msg err")); }

function render(l) {
  document.title = l.title + " - HATBODOL";
  const parts = [];
  const urls = (l.images || []).map((u) => fit(u, 900)).filter(Boolean);
  if (urls.length) {
    const g = el("div", undefined, "gallery");
    g.setAttribute("aria-label", "Photos");
    urls.forEach((u, i) => {
      const img = document.createElement("img");
      img.src = u; img.alt = l.title + " photo " + (i + 1);
      if (i) img.loading = "lazy";
      g.append(img);
    });
    parts.push(g);
  } else { parts.push(el("div", "No photo", "nophoto")); }

  parts.push(el("h1", l.title), el("div", priceText(l), "price"));

  const badges = el("div", undefined, "badges");
  [l.status === "sold" ? "Sold" : "", l.type === "exchange" ? "Exchange" : "For sale", CONDITIONS[l.condition], l.category]
    .filter(Boolean).forEach((t) => badges.append(el("span", t, "badge-pill")));
  parts.push(badges);

  if (l.description) parts.push(el("p", l.description, "desc"));

  const when = l.createdAt && l.createdAt.toDate
    ? l.createdAt.toDate().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "";
  const by = el("p", undefined, "lmeta");
  by.append(document.createTextNode("Posted by "));
  const who = el("a", l.ownerName || "Student", "link");
  who.href = "profile.html?uid=" + encodeURIComponent(l.ownerId || "");
  const tickSlot = el("span");
  by.append(who, tickSlot, document.createTextNode(when ? " on " + when : ""));
  parts.push(by);
  // Blue tick (only visible to signed-in users, as profiles are for signed-in users)
  getDoc(doc(db, "publicProfiles", l.ownerId)).then((s) => { if (s.exists() && s.data().verified) tickSlot.append(verifiedTick()); }).catch(() => {});

  const actions = el("div", undefined, "actions");
  const msgBtn = el("button", "Message seller (coming soon)", "btn btn-light");
  msgBtn.type = "button"; msgBtn.disabled = true;
  const share = el("button", "Share this listing", "btn");
  share.type = "button";
  share.addEventListener("click", async () => {
    try {
      if (navigator.share) { await navigator.share({ title: l.title, url: location.href }); }
      else if (navigator.clipboard) {
        await navigator.clipboard.writeText(location.href);
        share.textContent = "Link copied"; if (window.HBToast) window.HBToast.show("Link copied");
        setTimeout(() => { share.textContent = "Share this listing"; }, 1800);
      }
    } catch (e) { /* cancelled */ }
  });
  actions.append(share, msgBtn);
  parts.push(actions);

  box.replaceChildren(...parts);
}

(async () => {
  if (!id || id.length > 60) { fail("Listing not found."); return; }
  try {
    const s = await getDoc(doc(db, "listings", id));
    if (!s.exists()) { fail("This listing was not found."); return; }
    render(s.data());
  } catch (e) { fail("This listing is not available."); }
})();
