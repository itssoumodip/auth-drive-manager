import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import fileModel from '../models/files.model.js';

const router = express.Router();

router.get('/home', authenticate, (req, res) => {
    res.render('home', { user: req.user });
});

router.get('/gallery', authenticate, async (req, res) => {
    try {
        const userFiles = await fileModel.find({ user: req.user.userId })
            .sort({ createdAt: -1 }) 
            .lean();
            
        res.render('gallery', { 
            user: req.user,
            files: userFiles
        });
    } catch (error) {
        console.error('Error fetching user files:', error);
        res.status(500).render('error', { 
            message: 'Failed to load gallery',
            error: process.env.NODE_ENV === 'development' ? error : {}
        });
    }
});

export default router;