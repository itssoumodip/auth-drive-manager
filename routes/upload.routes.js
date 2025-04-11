import express from 'express';
import multer from 'multer';
import cloudinary from '../config/cloudinary.config.js';
import { Readable } from 'stream';
import fileModel from '../models/files.model.js'; 

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

    // For now, comment out the authentication check
    // if (!req.user || !req.user._id) {
    //   return res.status(401).json({
    //     success: false,
    //     error: 'Authentication required'
    //   });
    // }

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

    // Upload to Cloudinary and wait for result
    const cloudinaryResult = await uploadToCloudinary;
    
    // Save file info to database - temporarily without user reference
    const fileDoc = await fileModel.create({
      path: cloudinaryResult.secure_url,
      originalName: req.file.originalname,
      // Use a placeholder ID until authentication is set up
      user: '65f67e71a2d3d2b1f35e6c9a' // You can use any valid ObjectId or remove this field temporarily
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
      error: 'Failed to process upload'
    });
  }
});

export default router;