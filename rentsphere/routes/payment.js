const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Rental = require('../models/Rental');
const Item = require('../models/Item');

// @route   POST api/payment/create-payment-intent
// @desc    Create payment intent
// @access  Private
router.post('/create-payment-intent', auth, async (req, res) => {
  const { rentalId } = req.body;

  try {
    const rental = await Rental.findById(rentalId).populate('item');
    if (!rental) {
      return res.status(404).json({ error: 'Rental not found' });
    }

    if (rental.user.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(rental.totalPrice * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        rentalId: rental._id.toString(),
        userId: req.user.id
      }
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      amount: rental.totalPrice
    });
  } catch (err) {
    console.error('Error creating payment intent:', err);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// @route   POST api/payment/webhook
// @desc    Stripe webhook for payment events
// @access  Public
router.post('/webhook', express.raw({type: 'application/json'}), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle payment events
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      await handlePaymentSuccess(paymentIntent);
      break;
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      await handlePaymentFailure(failedPayment);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// Helper functions
async function handlePaymentSuccess(paymentIntent) {
  try {
    const rentalId = paymentIntent.metadata.rentalId;
    const rental = await Rental.findByIdAndUpdate(rentalId, {
      paymentStatus: 'completed',
      stripePaymentId: paymentIntent.id,
      status: 'approved'
    }, { new: true });

    // Mark item as unavailable during rental period
    await Item.findByIdAndUpdate(rental.item, {
      isAvailable: false
    });
  } catch (err) {
    console.error('Error handling payment success:', err);
  }
}

async function handlePaymentFailure(paymentIntent) {
  try {
    const rentalId = paymentIntent.metadata.rentalId;
    await Rental.findByIdAndUpdate(rentalId, {
      paymentStatus: 'failed'
    });
  } catch (err) {
    console.error('Error handling payment failure:', err);
  }
}

module.exports = router;