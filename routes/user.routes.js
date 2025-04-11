import express from 'express';
import { body, validationResult } from 'express-validator';
import userModel from '../models/user.model.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = express.Router();

router.get('/register', (req, res) => {
    res.render('register');
});

router.post('/register',
    body('email').trim().isEmail().isLength({ min: 13 }),
    body('password').trim().isLength({ min: 5 }),
    body('username').trim().isLength({ min: 3 }),
    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({
                errors: errors.array(),
                message: "Invalid Data"
            });
        }
        
        try {
            const { username, email, password } = req.body;

            // Check if user already exists
            const existingUser = await userModel.findOne({ 
                $or: [{ username }, { email }]
            });
            
            if (existingUser) {
                return res.status(400).json({
                    message: "Username or email already exists"
                });
            }

            const hashPassword = await bcrypt.hash(password, 10);

            const newUser = await userModel.create({
                username,
                email,
                password: hashPassword
            });

            const token = jwt.sign({
                userId: newUser._id,
                username: newUser.username,
                email: newUser.email
            }, process.env.JWT_SECRET, {
                expiresIn: '24h' 
            });

            res.cookie('token', token, {
                httpOnly: true,
                maxAge: 24 * 60 * 60 * 1000, 
                sameSite: 'strict'
            });

            res.redirect('/home');
        } catch (error) {
            console.error("Registration error:", error);
            res.status(500).json({
                message: "Error creating user",
                error: error.message
            });
        }
    }
);

router.get('/login', (req, res) => {
    res.render('login');
});

router.post('/login', 
    body('username').trim().isLength({ min: 3 }),
    body('password').trim().isLength({ min: 5 }),
    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: errors.array(),
                message: "Invalid Data"
            });
        }

        try {
            const { username, password } = req.body;

            const user = await userModel.findOne({ username });
            
            if (!user) {
                return res.status(400).json({ 
                    message: "Username or password is incorrect"
                });
            }
            
            const isMatch = await bcrypt.compare(password, user.password);
            
            if (!isMatch) {
                return res.status(400).json({ 
                    message: "Username or password is incorrect"
                });
            }
        
            const token = jwt.sign({
                userId: user._id,
                username: user.username,
                email: user.email
            }, process.env.JWT_SECRET, {
                expiresIn: '24h' 
            });

            res.cookie('token', token, {
                httpOnly: true,
                maxAge: 24 * 60 * 60 * 1000, 
                sameSite: 'strict'
            });

         
            res.redirect('/home');
        } catch (error) {
            console.error("Login error:", error);
            res.status(500).json({
                message: "Error during login",
                error: error.message
            });
        }
    }
);

router.get('/logout', (req, res) => {
    res.clearCookie('token');
    res.redirect('/user/login');
});

router.get('/', (req, res) => {
    res.redirect('/user/login');
});

export default router;