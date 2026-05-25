const express = require('express');
const router = express.Router();
const manuscriptController = require('../controllers/manuscriptController');

router.get('/', manuscriptController.getAll);
router.get('/search', manuscriptController.search);
router.get('/:id/pages', manuscriptController.getPages);

module.exports = router;
