// Cloudinary helpers for profile photos (square crop, resize, upload).
import { CLOUD_NAME, UPLOAD_PRESET } from "./cloudinary-config.js";

export const configured = !!CLOUD_NAME && !CLOUD_NAME.startsWith("YOUR_");

function loadImg(file) {
  return new Promise((res, rej) => {
    const u = URL.createObjectURL(file), i = new Image();
    i.onload = () => { URL.revokeObjectURL(u); res(i); };
    i.onerror = () => { URL.revokeObjectURL(u); rej(new Error("bad image")); };
    i.src = u;
  });
}

export async function compressSquare(file, size) {
  const img = await loadImg(file);
  const s = Math.min(img.width, img.height);
  const c = document.createElement("canvas");
  c.width = c.height = size;
  c.getContext("2d").drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("compress"))), "image/jpeg", 0.85));
}

export async function upload(blob) {
  const fd = new FormData();
  fd.append("file", blob); fd.append("upload_preset", UPLOAD_PRESET);
  const r = await fetch("https://api.cloudinary.com/v1_1/" + CLOUD_NAME + "/image/upload", { method: "POST", body: fd });
  if (!r.ok) throw new Error("upload");
  return (await r.json()).secure_url;
}
