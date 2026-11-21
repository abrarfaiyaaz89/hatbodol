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

export function priceText(l) {
  return l.type === "exchange" ? "Exchange" : "\u09F3 " + Number(l.price).toLocaleString("en-US");
}

export function renderCard(l) {
  const card = el("article", undefined, "lcard");
  const box = el("div", undefined, "lthumb");
  const src = l.images && l.images[0] ? thumb(l.images[0], 480, 360) : "";
  if (src) {
    const img = document.createElement("img");
    img.src = src; img.alt = l.title; img.loading = "lazy";
    box.append(img);
  } else {
    box.append(el("span", "No photo"));
  }
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
