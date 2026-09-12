// Wraps Twilio so the rest of the app just calls notifyShop(text)
// instead of touching Twilio's API directly.

const twilio = require('twilio');

let client = null;
function getClient() {
  if (client) return client;
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.warn('[twilioClient] Twilio credentials missing — SMS will be skipped.');
    return null;
  }
  client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  return client;
}

/**
 * Sends an urgent SMS straight to the shop owner's phone.
 * Fails silently (logs only) so a Twilio hiccup never blocks an order
 * from being saved — the order is still safe in Firestore either way.
 */
async function notifyShop(message) {
  const c = getClient();
  const to = process.env.SHOP_OWNER_PHONE;
  const from = process.env.TWILIO_FROM_NUMBER;

  if (!c || !to || !from) {
    console.warn('[twilioClient] Skipped SMS — missing client/number config.', { to, from: !!from });
    return { skipped: true };
  }

  if (String(to).replace(/\D/g, '') === String(from).replace(/\D/g, '')) {
    console.warn('[twilioClient] Skipped SMS — sender and recipient are the same number.');
    return { skipped: true };
  }

  try {
    const res = await c.messages.create({ body: message, from, to });
    console.log(`[twilioClient] SMS sent to ${to} (sid: ${res.sid})`);
    return res;
  } catch (err) {
    console.error('[twilioClient] Failed to send SMS:', err.message);
    return { error: err.message };
  }
}

module.exports = { notifyShop };
