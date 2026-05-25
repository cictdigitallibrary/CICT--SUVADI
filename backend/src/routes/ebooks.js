const express = require('express');
const router = express.Router();
const ebookController = require('../controllers/ebookController');

router.get('/', ebookController.getAll);

module.exports = router;
