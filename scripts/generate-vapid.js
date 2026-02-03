/**
 * Generate VAPID keys for Web Push. Add to .env.local and Vercel env:
 *   VAPID_PUBLIC_KEY=<publicKey>
 *   VAPID_PRIVATE_KEY=<privateKey>
 * Run: node scripts/generate-vapid.js
 */
const webPush = require("web-push");

const { publicKey, privateKey } = webPush.generateVAPIDKeys();

console.log("Add to .env.local and Vercel env:\n");
console.log("VAPID_PUBLIC_KEY=" + publicKey);
console.log("VAPID_PRIVATE_KEY=" + privateKey);
console.log("\nDo not commit the private key.");
