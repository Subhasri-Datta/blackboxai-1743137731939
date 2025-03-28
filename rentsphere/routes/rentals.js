const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Rental = require('../models/Rental');
const Item = require('../models/Item');

// @route   POST api/rentals
// @desc    Create rental
// @access  Private
router.post('/', auth, async (req, res) => {
  const { itemId, startDate, endDate } = req.body;

  try {
    const item = await Item.findById(itemId);
    if (!item || !item.isAvailable) {
      return res.status(400).json({ msg: 'Item not available' });
    }

    const totalPrice = item.pricePerDay * ((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24));

    const rental = new Rental({
      user: req.user.id,
      item: itemId,
      startDate,
      endDate,
      totalPrice,
      paymentStatus: 'pending'
    });

    await rental.save();
    res.json(rental);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/rentals/user
// @desc    Get user rentals
// @access  Private
router.get('/user', auth, async (req, res) => {
  try {
    const rentals = await Rental.find({ user: req.user.id }).populate('item');
    res.json(rentals);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   GET api/rentals/:id
// @desc    Get rental by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id).populate('item');
    if (!rental) {
      return res.status(404).json({ msg: 'Rental not found' });
    }
    res.json(rental);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/rentals/:id
// @desc    Delete rental
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const rental = await Rental.findById(req.params.id);
    if (!rental) {
      return res.status(404).json({ msg: 'Rental not found' });
    }

    // Check ownership
    if (rental.user.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized' });
    }

    await rental.remove();
    res.json({ msg: 'Rental removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;