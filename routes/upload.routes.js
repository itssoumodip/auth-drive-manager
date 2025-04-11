import express from 'express';
import multer from 'multer';
import cloudinary from '../config/cloudinary.config.js';
import { Readable } from 'stream';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const bufferToStream = (buffer) => {
  const readable = new Readable({
    read() {
      this.push(buffer);
      this.push(null);
    }
  });
  return readable;
};

router.post('/upload-to-cloudinary', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'drive-manager' },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            return res.status(500).json({
              success: false,
              error: 'Failed to upload to cloud'
            });
          }
          
          return res.json({
            success: true,
            url: result.secure_url,
            public_id: result.public_id
          });
        }
      );
      
      bufferToStream(req.file.buffer).pipe(stream);
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process upload'
    });
  }
});

export default router;