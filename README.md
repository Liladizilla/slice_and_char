# Slice & Char

A full-stack pizza ordering system for independent pizzerias. Features a customer-facing web storefront with a pizza builder and spin-to-win wheel, an Express.js order backend with Twilio SMS notifications and IntaSend mobile-money payments, and a mobile-optimized admin dashboard for real-time order management.

## Architecture

```
frontend/   →  Customer storefront — menu, pizza builder, spin wheel, cart, checkout
backend/    →  Node.js / Express server — persists orders to Firestore, sends SMS, processes payments
admin/      →  PWA dashboard — live order feed with one-tap status updates
```

The frontend and admin are static sites that communicate exclusively through public configuration and the backend API. The backend holds all secrets and connects to Firebase, Twilio, and IntaSend with server-side credentials.

## Features

- **Customer storefront** — responsive web app with pizza builder and spin-to-win discount wheel
- **Real-time order management** — live order feed with status workflow (received → paid → baking → ready → delivered)
- **SMS notifications** — every new order and payment confirmation is texted to the owner's phone via Twilio
- **Mobile payments** — M-Pesa STK push and card checkout via IntaSend
- **Firestore security** — rules ensure only authenticated admins can read or update orders
- **Progressive Web App** — admin dashboard installs to the home screen for a native-like experience

## Prerequisites

| Service | Purpose |
|---------|---------|
| [Firebase](https://console.firebase.google.com) | Firestore database, Authentication, Admin SDK |
| [Twilio](https://www.twilio.com) | SMS notifications |
| [IntaSend](https://intasend.com) | M-Pesa and card payments |

## Setup Guide

### 1. Configure Firebase

1. Go to the [Firebase Console](https://console.firebase.google.com) → **Add project** → name it (e.g. `slice-and-char`).
2. In the project, go to **Build → Firestore Database → Create database** → start in **production mode**.
3. Go to **Firestore → Rules** and paste in the contents of `firestore.rules` from this project, then click **Publish**.
4. Go to **Build → Authentication → Get started → Sign-in method → Email/Password → Enable**.
5. Still in Authentication, go to the **Users** tab → **Add user** → create yourself an admin login (email + strong password). This is the account you'll sign into `admin.html` with on your phone.
6. Get your **web config**: Project Settings (gear icon) → General → "Your apps" → click the `</>` (web) icon → register an app → copy the `firebaseConfig` object.
7. Get your **service account key** (backend-only secret): Project Settings → **Service accounts** tab → **Generate new private key** → downloads a `.json` file.
   - Save it as `backend/config/serviceAccountKey.json`.
   - This file is already covered by `.gitignore` — never commit it or share it.

### 2. Configure Twilio

1. Sign up at [Twilio](https://www.twilio.com) (free trial gives you credit to start).
2. From the [Twilio Console](https://console.twilio.com), copy your **Account SID** and **Auth Token**.
3. Buy a phone number (Console → Phone Numbers → Buy a number) — this becomes your `TWILIO_FROM_NUMBER`.
4. Your owner phone number should be set as `SHOP_OWNER_PHONE` — this is where every order and payment confirmation lands as an SMS.
5. On a trial account, Twilio can only text *verified* numbers — verify your owner phone number under Console → Verified Caller IDs before testing. Upgrading to a paid account removes this limit.

### 3. Configure IntaSend

1. Sign up at [IntaSend](https://intasend.com).
2. Dashboard → **API Keys** → copy your **Publishable Key** and **Secret Key** (use sandbox/test keys while building).
3. Once you're ready to take real payments: dashboard → **Settings → Webhooks** → add
   `https://your-backend-domain.com/api/webhooks/intasend`
   This tells your backend a payment went through so it can text you the payment confirmation and mark the order as paid.
4. Set `INTASEND_TEST_MODE=false` in your backend `.env` when you go live, and swap in your live (non-test) keys.

### 4. Run Locally

```bash
cd backend
cp .env.example .env
```

Fill in `.env` with everything from steps 1–3. Then:

```bash
npm install
npm run dev
```

You should see:

```
Order backend listening on port 3000
Orders will text: +254713324135
```

Open `frontend/index.html` in a browser (or serve it with any static server). Add something to the cart, place an order — you should get an SMS within seconds, and a new document should appear in Firestore under `orders`.

Open `admin/admin.html` on your phone's browser, sign in with the admin account you created in step 1.5, and the order should appear live. Tap through the status buttons (received → paid → baking → ready → delivered) as you work the order — the customer-facing site doesn't show this, but Twilio will text you again automatically once IntaSend confirms payment.

**Install the admin dashboard on your home screen:** open `admin.html` on your phone in Chrome or Safari, then use "Add to Home Screen" — the included `manifest.json` makes it open full-screen like a real app. Combined with the Twilio SMS, you get two independent alerts for every order: one that lands even if you're not looking at your phone screen (SMS), and one you can act on right away (the dashboard).

## Deployment

| Component | Recommended Hosts | Notes |
|-----------|-------------------|-------|
| **Backend** | Render, Railway, Fly.io | Push the `backend/` folder, set the same environment variables from `.env` in the host dashboard (never upload `.env` itself), and upload `serviceAccountKey.json` as a secret file or paste its contents into a `FIREBASE_SERVICE_ACCOUNT_JSON` env var (see note in `firebaseAdmin.js`). |
| **Frontend** | Vercel, Netlify, GitHub Pages | Point them at `frontend/index.html`. Update the `BACKEND_URL` constant near the bottom of that file to your deployed backend's URL first. |
| **Admin** | Same static hosts | Safe to deploy publicly — Firebase Auth protects the data; no one can see order data without signing in as you. |

## File Structure

```
slice-and-char/
├── backend/
│   ├── server.js              Express app entry point
│   ├── routes/
│   │   ├── orders.js          POST new order, PATCH order status
│   │   └── webhooks.js        IntaSend payment confirmation handler
│   ├── config/
│   │   ├── firebaseAdmin.js   Firestore connection with service account
│   │   ├── twilioClient.js    SMS notification utility
│   │   └── intasend.js        M-Pesa STK push + card checkout wrapper
│   ├── .env.example           Template for all environment variables
│   └── package.json           Node.js dependencies and scripts
├── frontend/
│   ├── index.html             Customer storefront (menu, builder, cart, checkout)
│   └── assets/                Menu images and static assets
├── admin/
│   ├── admin.html             Live order dashboard (Firebase Auth protected)
│   └── manifest.json          PWA install configuration
├── firestore.rules            Firestore security rules
├── .gitignore
└── README.md
```

## Security Notes

- `.env` files and `serviceAccountKey.json` are excluded from version control via `.gitignore`.
- The backend uses the Firebase Admin SDK, which bypasses Firestore security rules — it must only run server-side.
- Firebase web config in the frontend and admin is public by design. Data protection is enforced through Firestore security rules, not by hiding the config.
- Never commit secret keys, service account JSON, or `.env` files to version control.
- Twilio can only text verified numbers on trial accounts. Upgrade to a paid account for production use.

## License

This project is provided as-is for educational and commercial use.
