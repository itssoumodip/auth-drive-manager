// In your server file
import express from 'express';
import multer from 'multer';
import cloudinary from './config/cloudinary.config.js';

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Route to handle Cloudinary uploads
app.post('/upload-to-cloudinary', upload.single('file'), async (req, res) => {
  try {
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path);
    
    // Return success with the URL
    res.json({
      success: true,
      url: result.secure_url
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload to cloud'
    });
  }
});