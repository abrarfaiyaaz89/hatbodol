import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { collection, query, where, getDocs, getDoc, doc, writeBatch } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { auth, db } from "./fb.js";

const note = document.getElementById("note");
const list = document.getElementById("list");

function say(text) { note.textContent = text; note.className = text ? "msg err" : "msg"; }
function el(tag, text, cls) {
  const n = document.createElement(tag);
  if (text !== undefined) n.textContent = text;
  if (cls) n.className = cls;
  return n;
}

async function decide(card, uid, status, buttons, u, p) {
  buttons.forEach((b) => { b.disabled = true; });
  try {
    const batch = writeBatch(db);
    batch.update(doc(db, "users", uid), { verificationStatus: status });
    const name = (u.displayName || "").trim();
    const pub = { displayName: name.length >= 2 ? name.slice(0, 80) : "Student", verified: status === "verified" };
    if (status === "verified" && p.department) pub.department = String(p.department).slice(0, 80);
    batch.set(doc(db, "publicProfiles", uid), pub, { merge: true });
    if (status === "verified" && p.studentId) batch.set(doc(db, "studentIds", uid), { studentId: p.studentId });
    await batch.commit();
    card.remove();
    if (!list.children.length) { note.className = "msg ok"; note.textContent = "No pending requests."; }
  } catch (e) {
    buttons.forEach((b) => { b.disabled = false; });
    say("Could not save the decision. Please try again.");
  }
}

async function load() {
  list.replaceChildren();
  const snap = await getDocs(query(collection(db, "users"), where("verificationStatus", "==", "pending")));
  if (snap.empty) { note.className = "msg ok"; note.textContent = "No pending requests."; return; }
  note.className = "msg"; note.textContent = "";
  for (const d of snap.docs) {
    const u = d.data();
    let p = {};
    try { const ps = await getDoc(doc(db, "studentProfiles", d.id)); if (ps.exists()) p = ps.data(); } catch (e) { /* show what we have */ }
    const card = el("div", undefined, "req");
    card.append(
      el("strong", u.displayName || "(no name)"),
      el("div", u.email || ""),
      el("div", "Student ID: " + (p.studentId || "-")),
      el("div", "Department: " + (p.department || "-")),
      el("div", "University email: " + (p.universityEmail || "-"))
    );
    const row = el("div", undefined, "row");
    const ok = el("button", "Approve", "btn"); ok.type = "button";
    const no = el("button", "Reject", "btn btn-light"); no.type = "button";
    ok.addEventListener("click", () => decide(card, d.id, "verified", [ok, no], u, p));
    no.addEventListener("click", () => decide(card, d.id, "rejected", [ok, no], u, p));
    row.append(ok, no);
    card.append(row);
    list.append(card);
  }
}

onAuthStateChanged(auth, async (user) => {
  if (!user) { say("Please log in first."); return; }
  try {
    const a = await getDoc(doc(db, "admins", user.uid));
    if (!a.exists()) { say("You are not an administrator."); return; }
    await load();
  } catch (e) { say("Could not load. Please reload the page."); }
});
