const express = require('express');
const router = express.Router();
const { getDb, admin } = require('../config/firebaseAdmin');
const { notifyShop } = require('../config/twilioClient');
const { stkPush, createCheckout } = require('../config/intasend');

function generateOrderNumber() {
  return 'SC' + Math.floor(1000 + Math.random() * 9000);
}

function formatOrderSms(orderNo, { items, total, phone, zoneFee, payMethod }) {
  const lines = items.map((i) => `- ${i.name} (${i.meta}) — KSh ${i.price}`).join('\n');
  const deliveryLine = zoneFee > 0 ? `Delivery fee: KSh ${zoneFee}\n` : 'Pickup — no delivery fee\n';
  return (
    `NEW ORDER ${orderNo}\n` +
    `${lines}\n` +
    deliveryLine +
    `TOTAL: KSh ${total}\n` +
    `Customer: ${phone}\n` +
    `Paying via: ${payMethod === 'mpesa' ? 'M-Pesa' : 'Card'}`
  );
}

// POST /api/orders — customer places an order
router.post('/', async (req, res) => {
  const { items, total, phone, zoneFee = 0, payMethod = 'mpesa' } = req.body;

  if (!items || !items.length) return res.status(400).json({ error: 'Cart is empty' });
  if (!phone) return res.status(400).json({ error: 'Phone number is required' });

  const orderNo = generateOrderNumber();
  const db = getDb();

  const orderDoc = {
    orderNo,
    items,
    total,
    zoneFee,
    phone,
    payMethod,
    status: 'received', // received -> paid -> baking -> ready -> delivered
    createdAt: admin && db ? admin.firestore.FieldValue.serverTimestamp() : new Date().toISOString(),
  };

  try {
    // 1. Save to Firestore so the admin dashboard sees it in real time.
    if (db) {
      await db.collection('orders').doc(orderNo).set(orderDoc);
    } else {
      console.warn('[orders] Firestore not configured — order was not persisted:', orderNo);
    }

    // 2. Text the shop owner immediately. This happens even if Firestore
    //    isn't set up yet, so you never miss an order while wiring things up.
    await notifyShop(formatOrderSms(orderNo, { items, total, phone, zoneFee, payMethod }));

    // 3. Kick off payment collection.
    let payment;
    if (payMethod === 'mpesa') {
      payment = await stkPush({ amount: total, phoneNumber: phone, apiRef: orderNo });
    } else {
      payment = await createCheckout({
        amount: total,
        apiRef: orderNo,
        redirectUrl: `${process.env.FRONTEND_URL}/order-confirmed?order=${orderNo}`,
      });
    }

    res.json({ orderNo, payment });
  } catch (err) {
    console.error('[orders] Failed to create order:', err.response?.data || err.message);
    res.status(500).json({ error: 'Could not process your order. Please try again.' });
  }
});

// PATCH /api/orders/:orderNo — admin updates status (received/paid/baking/ready/delivered)
router.patch('/:orderNo', async (req, res) => {
  const db = getDb();
  if (!db) return res.status(500).json({ error: 'Firestore not configured' });

  const { status } = req.body;
  const allowed = ['received', 'paid', 'baking', 'ready', 'delivered', 'cancelled'];
  if (!allowed.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  try {
    await db.collection('orders').doc(req.params.orderNo).update({ status });
    res.json({ ok: true });
  } catch (err) {
    console.error('[orders] Failed to update status:', err.message);
    res.status(500).json({ error: 'Could not update order' });
  }
});

module.exports = router;
