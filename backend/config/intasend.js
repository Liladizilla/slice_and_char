// Thin wrapper around IntaSend's REST API for M-Pesa STK push and
// card checkout links. Switches base URL automatically based on
// INTASEND_TEST_MODE so you don't accidentally hit production
// while testing.

const axios = require('axios');

function baseUrl() {
  const isTest = process.env.INTASEND_TEST_MODE !== 'false';
  return isTest ? 'https://sandbox.intasend.com/api/v1' : 'https://payment.intasend.com/api/v1';
}

function authHeader() {
  return { Authorization: `Bearer ${process.env.INTASEND_SECRET_KEY}` };
}

/** Triggers an M-Pesa STK push prompt directly on the customer's phone. */
async function stkPush({ amount, phoneNumber, apiRef }) {
  const { data } = await axios.post(
    `${baseUrl()}/payment/mpesa-stk-push/`,
    { amount, phone_number: phoneNumber, api_ref: apiRef },
    { headers: authHeader() }
  );
  return data;
}

/** Creates a hosted checkout page URL for card payments. */
async function createCheckout({ amount, apiRef, redirectUrl }) {
  const { data } = await axios.post(
    `${baseUrl()}/checkout/`,
    {
      amount,
      currency: 'KES',
      api_ref: apiRef,
      redirect_url: redirectUrl,
    },
    { headers: authHeader() }
  );
  return data;
}

module.exports = { stkPush, createCheckout };
