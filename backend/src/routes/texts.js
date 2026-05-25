const express = require('express');
const router = express.Router();
const textController = require('../controllers/textController');

router.get('/', textController.getAll);
router.get('/editions', textController.getEditions);
router.get('/:id', textController.getById);

module.exports = router;
