import express from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
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