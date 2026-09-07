const express = require('express');
const router = express.Router();
const { getDb } = require('../config/firebaseAdmin');
const { notifyShop } = require('../config/twilioClient');

// POST /api/webhooks/intasend — IntaSend calls this automatically when a
// payment finishes. Set this exact URL in your IntaSend dashboard under
// Settings > Webhooks, e.g. https://your-backend.com/api/webhooks/intasend
router.post('/intasend', async (req, res) => {
  const { state, api_ref: orderNo } = req.body;

  console.log('[webhook] IntaSend event:', state, orderNo);

  if (state === 'COMPLETE' && orderNo) {
    const db = getDb();
    if (db) {
      await db.collection('orders').doc(orderNo).update({ status: 'paid' });
    }
    await notifyShop(`Payment CONFIRMED for order ${orderNo}. Start baking.`);
  }

  if (state === 'FAILED' && orderNo) {
    const db = getDb();
    if (db) {
      await db.collection('orders').doc(orderNo).update({ status: 'cancelled' });
    }
    await notifyShop(`Payment FAILED for order ${orderNo}. Customer may retry.`);
  }

  // IntaSend just needs a 200 to know you received it.
  res.sendStatus(200);
});

module.exports = router;
