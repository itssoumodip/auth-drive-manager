import express from 'express';
import multer from 'multer';
import cloudinary from '../config/cloudinary.config.js';
import { Readable } from 'stream';
import fileModel from '../models/files.model.js';
import { authenticate } from '../middleware/auth.middleware.js';

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


router.post('/upload-to-cloudinary', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.user || !req.user.userId) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const uploadToCloudinary = new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'drive-manager' },
        (error, result) => {
          if (error) {
            reject(error);
            return;
          }
          resolve(result);
        }
      );
      
      bufferToStream(req.file.buffer).pipe(stream);
    });


    const cloudinaryResult = await uploadToCloudinary;
    
    console.log('User ID from token:', req.user.userId);
    
    const fileDoc = await fileModel.create({
      path: cloudinaryResult.secure_url,
      originalName: req.file.originalname,
      user: req.user.userId 
    });

    return res.json({
      success: true,
      url: cloudinaryResult.secure_url,
      public_id: cloudinaryResult.public_id,
      fileId: fileDoc._id
    });
      
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process upload: ' + error.message
    });
  }
});

export default router;