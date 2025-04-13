import express from 'express';
import multer from 'multer';
import cloudinary from '../config/cloudinary.config.js';
import { Readable } from 'stream';
import fileModel from '../models/files.model.js';
import { authenticate } from '../middleware/auth.middleware.js';
import axios from 'axios';

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
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file provided' });
    }

    console.log('File received:', req.file.originalname);
    console.log('Cloudinary config:', {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'Not set',
      apiKey: process.env.CLOUDINARY_API_KEY ? 'Set' : 'Not set',
      apiSecret: process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Not set'
    });

    if (!process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_SECRET) {
      console.error('Cloudinary credentials are missing');
      return res.status(500).json({ success: false, error: 'Cloud storage configuration missing' });
    }

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: 'drive-manager' },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      bufferToStream(req.file.buffer).pipe(uploadStream);
    });

    const newFile = await fileModel.create({
      path: result.secure_url,
      originalName: req.file.originalname,
      user: req.user.userId
    });

    res.json({
      success: true,
      url: result.secure_url,
      fileId: newFile._id
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to upload file'
    });
  }
});

router.delete('/delete-file/:id', authenticate, async (req, res) => {
  try {
    const fileId = req.params.id;
    console.log('Delete request received for file ID:', fileId);
    
    const file = await fileModel.findOne({ 
      _id: fileId,
      user: req.user.userId
    });
    
    if (!file) {
      console.log('File not found or unauthorized:', fileId);
      return res.status(404).json({
        success: false,
        error: 'File not found or you do not have permission to delete it'
      });
    }
    
    console.log('Found file to delete:', file.originalName);
    
    if (file.path && file.path.includes('cloudinary')) {
      try {
        const publicId = file.path.split('/').pop().split('.')[0];
        console.log('Attempting to delete from Cloudinary:', publicId);
      } catch (cloudinaryError) {
        console.error('Cloudinary delete error:', cloudinaryError);
      }
    }
    
    await fileModel.deleteOne({ _id: fileId });
    console.log('File deleted from database:', fileId);
    
    return res.json({
      success: true,
      message: 'File deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete file: ' + error.message
    });
  }
});

router.get('/download/:id', authenticate, async (req, res) => {
  try {
    const fileId = req.params.id;
    
    const file = await fileModel.findOne({ 
      _id: fileId,
      user: req.user.userId
    });
    
    if (!file) {
      return res.status(404).send('File not found');
    }
    
    if (file.path.startsWith('http')) {
      try {
        const response = await axios({
          method: 'GET',
          url: file.path,
          responseType: 'stream'
        });
        
        res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
        
        if (response.headers['content-type']) {
          res.setHeader('Content-Type', response.headers['content-type']);
        }
        
        response.data.pipe(res);
      } catch (error) {
        console.error('Error downloading external file:', error);
        res.status(500).send('Failed to download file');
      }
    } else {
      res.download(file.path, file.originalName);
    }
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).send('Error processing download request');
  }
});

export default router;