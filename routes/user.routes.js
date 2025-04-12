import express from 'express';
import { body, validationResult } from 'express-validator';
import userModel from '../models/user.model.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = express.Router();

router.get('/register', (req, res) => {
    res.render('register', { error: null });
});

router.post('/register',
    body('email').trim().isEmail().isLength({ min: 13 }),
    body('password').trim().isLength({ min: 5 }),
    body('username').trim().isLength({ min: 3 }),
    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.render('register', { 
                error: "Please check your input - all fields must be valid",
                formData: req.body
            });
        }
        
        try {
            const { username, email, password } = req.body;

            const existingUser = await userModel.findOne({ 
                $or: [{ username }, { email }]
            });
            
            if (existingUser) {
                return res.render('register', { 
                    error: "Username or email already exists",
                    formData: req.body 
                });
            }

            const hashPassword = await bcrypt.hash(password, 10);

            await userModel.create({
                username,
                email,
                password: hashPassword
            });

            res.redirect('/user/login?registered=success');
        } catch (error) {
            console.error("Registration error:", error);
            res.render('register', { 
                error: "An error occurred while creating your account. Please try again.",
                formData: req.body
            });
        }
    }
);

router.get('/login', (req, res) => {
    res.render('login', { error: null });
});

router.post('/login', 
    body('username').trim().isLength({ min: 3 }),
    body('password').trim().isLength({ min: 5 }),
    async (req, res) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.render('login', { 
                error: "Username and password must be valid",
                formData: req.body
            });
        }

        try {
            const { username, password } = req.body;

            const user = await userModel.findOne({ username });
            
            if (!user) {
                return res.render('login', { 
                    error: "Username or password is incorrect",
                    formData: { username }
                });
            }
            
            const isMatch = await bcrypt.compare(password, user.password);
            
            if (!isMatch) {
                return res.render('login', { 
                    error: "Username or password is incorrect",
                    formData: { username }
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
            res.render('login', { 
                error: "An error occurred during login. Please try again.",
                formData: { username: req.body.username }
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