// Account menu at the right end of the top bar (avatar button + menu panel).
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth } from "./fb.js";

const slot = document.getElementById("user-menu");
const root = document.documentElement;
let btn = null, panel = null, isOpen = false;

function mk(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}
function item(tag, text) {
  const n = mk(tag, "um-item");
  n.setAttribute("role", "menuitem");
  n.tabIndex = -1;
  n.append(mk("span", "", text));
  if (tag === "button") n.type = "button";
  return n;
}
function items() {
  return Array.from(panel.querySelectorAll('[role^="menuitem"]')).filter((n) => n.offsetParent !== null);
}

function openMenu(focus) {
  if (isOpen) return;
  isOpen = true;
  panel.hidden = false;
  btn.setAttribute("aria-expanded", "true");
  const list = items();
  if (focus === "first" && list.length) list[0].focus();
  else if (focus === "last" && list.length) list[list.length - 1].focus();
  else panel.focus();
}
function closeMenu(returnFocus) {
  if (!isOpen) return;
  isOpen = false;
  panel.hidden = true;
  btn.setAttribute("aria-expanded", "false");
  if (returnFocus) btn.focus();
}

function build(user) {
  const name = user.displayName || "Student";
  const email = user.email || "";

  btn = mk("button", "um-btn");
  btn.type = "button";
  btn.id = "um-btn";
  btn.setAttribute("aria-haspopup", "menu");
  btn.setAttribute("aria-expanded", "false");
  btn.setAttribute("aria-controls", "um-panel");
  btn.setAttribute("aria-label", "Account menu for " + name);
  if (user.photoURL) {
    const img = document.createElement("img");
    img.src = user.photoURL; img.alt = ""; img.referrerPolicy = "no-referrer"; img.decoding = "async";
    btn.append(img);
  } else {
    btn.append(document.createTextNode((name || email || "S").trim().charAt(0).toUpperCase()));
  }

  panel = mk("div", "um-panel");
  panel.id = "um-panel";
  panel.setAttribute("role", "menu");
  panel.setAttribute("aria-labelledby", "um-btn");
  panel.tabIndex = -1;
  panel.hidden = true;

  // Label: not a menu item, so arrow keys skip it
  const label = mk("div", "um-label");
  label.setAttribute("role", "presentation");
  label.append(mk("strong", "um-name", name));
  const em = mk("span", "um-email", email);
  em.title = email;
  label.append(em);

  const profile = item("a", "Profile"); profile.href = "auth.html";
  const settings = item("a", "Settings"); settings.href = "settings.html";

  // Dark mode lives here on phones (hidden on desktop, where the header has its own button)
  const dark = item("button", "Dark mode");
  dark.classList.add("um-mobile-only");
  dark.setAttribute("role", "menuitemcheckbox");
  const state = mk("span", "um-state");
  dark.append(state);
  const syncDark = () => {
    const on = root.getAttribute("data-theme") === "dark";
    dark.setAttribute("aria-checked", String(on));
    state.textContent = on ? "On" : "Off";
  };
  syncDark();
  dark.addEventListener("click", () => { if (window.HBTheme) window.HBTheme.toggle(); syncDark(); });

  const sep = mk("div", "um-sep");
  sep.setAttribute("role", "separator");

  const out = item("button", "Sign out");
  out.addEventListener("click", async () => {
    closeMenu(false);
    try { await signOut(auth); if (window.HBToast) window.HBToast.show("Signed out"); } catch (e) { /* ignore */ }
  });

  panel.append(label, profile, settings, dark, sep, out);
  slot.append(btn, panel);

  // Open on click (Enter/Space also fire click). Keyboard opens focus the first item.
  btn.addEventListener("click", (e) => {
    if (isOpen) closeMenu(false);
    else openMenu(e.detail === 0 ? "first" : "panel");
  });
  btn.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); openMenu("first"); }
    else if (e.key === "ArrowUp") { e.preventDefault(); openMenu("last"); }
  });

  panel.addEventListener("keydown", (e) => {
    const list = items();
    const i = list.indexOf(document.activeElement);
    if (e.key === "ArrowDown") { e.preventDefault(); list[(i + 1) % list.length].focus(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); list[(i - 1 + list.length) % list.length].focus(); }
    else if (e.key === "Home") { e.preventDefault(); list[0].focus(); }
    else if (e.key === "End") { e.preventDefault(); list[list.length - 1].focus(); }
    else if (e.key === "Escape") { e.preventDefault(); closeMenu(true); }
    else if (e.key === "Tab") { closeMenu(false); }
  });
  // Links close the menu on the way out
  panel.querySelectorAll("a.um-item").forEach((a) => a.addEventListener("click", () => closeMenu(false)));
}

if (slot) {
  document.addEventListener("pointerdown", (e) => { if (isOpen && !slot.contains(e.target)) closeMenu(false); });
  onAuthStateChanged(auth, (user) => {
    try { localStorage.setItem("hb-signed", user ? "1" : "0"); } catch (e) { /* ignore */ }
    root.classList.toggle("signed-in", !!user);
    isOpen = false;
    slot.replaceChildren();
    btn = null; panel = null;
    if (user) build(user);
  });
}
