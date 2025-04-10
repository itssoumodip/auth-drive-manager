import expreess from 'express';

const router = expreess.Router();

router.get('/home', (req, res) => {
    res.render('home');
})


export default router;