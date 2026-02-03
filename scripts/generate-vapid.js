/**
 * Generate VAPID keys for Web Push. Add these to .env.local:
 *
 *   VAPID_PUBLIC_KEY=<publicKey below>
 *   VAPID_PRIVATE_KEY=<privateKey below>
 *
 * Run: node scripts/generate-vapid.js
 */
const webPush = require("web-push");

const { publicKey, privateKey } = webPush.generateVAPIDKeys();
