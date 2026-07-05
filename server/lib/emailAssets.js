import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS_DIR = path.join(__dirname, "../assets/email");

/** CID tokens referenced in HTML: src="cid:os-logo" */
export const EMAIL_IMAGE_CIDS = {
  logo: "os-logo",
  hero: "os-hero",
};

function readAsset(filename) {
  const filePath = path.join(ASSETS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing email asset: ${filePath}`);
  }
  return fs.readFileSync(filePath);
}

let attachmentCache = null;

/** Inline attachments so logo/hero show even when remote images are blocked. */
export function getEmailInlineAttachments() {
  if (attachmentCache) return attachmentCache;

  attachmentCache = [
    {
      filename: "one-source-logo.png",
      content: readAsset("logo-on-dark-stacked.png"),
      cid: EMAIL_IMAGE_CIDS.logo,
      contentDisposition: "inline",
    },
    {
      filename: "one-source-hero.jpg",
      content: readAsset("email-hero.jpg"),
      cid: EMAIL_IMAGE_CIDS.hero,
      contentDisposition: "inline",
    },
  ];

  return attachmentCache;
}

export function emailAssetsReady() {
  try {
    getEmailInlineAttachments();
    return true;
  } catch {
    return false;
  }
}
