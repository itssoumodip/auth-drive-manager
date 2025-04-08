import express from 'express';
import userRouter from './routes/user.routes.js';

const app = express();
   
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/user', userRouter);

app.listen(3005, () => {
    console.log('Server is running on port 3005');
})