require('dotenv').config();
const express = require('express');
const cors = require('cors');

const ordersRoute = require('./routes/orders');
const webhooksRoute = require('./routes/webhooks');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json());

// Simple request log — helpful while you're wiring things up
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

app.get('/', (req, res) => res.send('Slice & Char order backend is running.'));
app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

app.use('/api/orders', ordersRoute);
app.use('/api/webhooks', webhooksRoute);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Order backend listening on port ${PORT}`);
  console.log(`Orders will text: ${process.env.SHOP_OWNER_PHONE || '(no phone configured yet)'}`);
});
