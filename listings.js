// Shared helpers for listings (used by post.js and explore.js).
export const CATEGORIES = ["Books", "Electronics", "Furniture", "Clothing", "Stationery", "Sports", "Other"];
export const CONDITIONS = { "new": "New", "like-new": "Like new", "good": "Good", "fair": "Fair" };

export function el(tag, text, cls) {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  if (cls) n.className = cls;
  return n;
}

export function keywords(title) {
  const words = title.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length >= 2);
  return Array.from(new Set(words)).slice(0, 10);
}

export function thumb(url, w, h) {
  if (!/^https:\/\/res\.cloudinary\.com\//.test(url)) return "";
  return url.replace("/upload/", "/upload/w_" + w + ",h_" + h + ",c_fill,q_auto,f_auto/");
}

export function fit(url, w) {
  if (!/^https:\/\/res\.cloudinary\.com\//.test(url)) return "";
  return url.replace("/upload/", "/upload/w_" + w + ",c_limit,q_auto,f_auto/");
}

export function priceText(l) {
  return l.type === "exchange" ? "Exchange" : "\u09F3 " + Number(l.price).toLocaleString("en-US");
}

export function renderCard(l) {
  const card = l.id ? el("a", undefined, "lcard") : el("article", undefined, "lcard");
  if (l.id) card.href = "listing.html?id=" + encodeURIComponent(l.id);
  const box = el("div", undefined, "lthumb");
  const src = l.images && l.images[0] ? thumb(l.images[0], 480, 360) : "";
  if (src) {
    const img = document.createElement("img");
    img.className = "fade"; img.alt = l.title; img.loading = "lazy";
    img.addEventListener("load", () => img.classList.add("loaded"));
    img.src = src;
    if (img.complete && img.naturalWidth) img.classList.add("loaded");
    box.append(img);
  } else {
    box.append(el("span", "No photo"));
  }
  if (l.status === "sold") box.append(el("span", "Sold", "badge"));
  const body = el("div", undefined, "lbody");
  body.append(
    el("strong", l.title, "ltitle"),
    el("div", priceText(l), "lprice"),
    el("div", [CONDITIONS[l.condition], l.category].filter(Boolean).join(" \u00B7 "), "lmeta"),
    el("div", "By " + (l.ownerName || "Student"), "lmeta")
  );
  card.append(box, body);
  return card;
}

export function skeletonCards(n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const c = el("div", undefined, "lcard skeleton");
    c.setAttribute("aria-hidden", "true");
    const b = el("div", undefined, "lbody");
    b.append(el("div", undefined, "sk-line"), el("div", undefined, "sk-line short"));
    c.append(el("div", undefined, "lthumb"), b);
    out.push(c);
  }
  return out;
}

// Blue verified tick (static markup, no user data)
export function verifiedTick() {
  const t = el("span", undefined, "vtick");
  t.setAttribute("role", "img");
  t.setAttribute("aria-label", "Verified");
  t.title = "Verified student";
  t.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="currentColor"/><path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  return t;
}
