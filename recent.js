import { collection, query, where, orderBy, limit, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { db } from "./fb.js";
import { renderCard, skeletonCards } from "./listings.js";

const grid = document.getElementById("recent-grid");
const empty = document.getElementById("recent-empty");
grid.replaceChildren(...skeletonCards(4));
(async () => {
  try {
    const snap = await getDocs(query(collection(db, "listings"), where("status", "==", "active"), orderBy("createdAt", "desc"), limit(4)));
    if (snap.empty) { grid.replaceChildren(); empty.hidden = false; return; }
    grid.replaceChildren(...snap.docs.map((d) => renderCard({ id: d.id, ...d.data() })));
  } catch (e) {
    grid.replaceChildren(); empty.hidden = false;
  }
})();
