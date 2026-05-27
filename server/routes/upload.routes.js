const express = require('express');
const router = express.Router();
const multer = require('multer');
const { uploadPdf } = require('../controllers/upload.controller');
const { protect } = require('../middleware/auth.middleware');

// Store in memory (we process the buffer directly, no disk needed)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are accepted.'), false);
    }
  },
});

router.post('/pdf', protect, upload.single('pdf'), uploadPdf);

module.exports = router;
