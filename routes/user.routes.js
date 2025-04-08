import express from 'express';
import { body, validationResult } from 'express-validator';
import userModel from '../models/user.model.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const router = express.Router();


router.get('/register', (req, res) => {
    res.render('register');
})


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
            })
        }
        const { username, email, password } = req.body;

        const hashPassword = await bcrypt.hash(password, 10);

        const newUser = await userModel.create({
            username,
            email,
            password: hashPassword
        })

    res.json(newUser);

})

router.get('/login', (req, res) => {
    res.render('login');
})

router.post('/login', 
    body('username').trim().isLength({ min: 3}),
    body('password').trim().isLength({ min: 5}),
    async (req, res) => {
        
        const errors = validationResult(req); //if there are errors in the request body, it will be stored in the errors variable

        if (!errors.isEmpty()) 
            return res.status(400).json({
                error: errors.array(),
                message: "Invalid Data"
            })

        const { username, password } = req.body;

        const user = await userModel.findOne({ username: username });
        const isMatch = user && await bcrypt.compare(password, user.password);
        if (!user || !isMatch) {
            return res.status(400).json({ 
                message: "username or password is incorrect"
            })
        }
    
    const token = jwt.sign({
        userId: user._id,
        username: user.username,
        email: user.email
    }, 
    process.env.JWT_SECRET,
    )   

    res.cookie('token', token);
    
    res.send('Logged in successfully');
    

})

export default router;