import mongoose from "mongoose";

function connectToDB() {
    mongoose.connect(process.env.MONGO_URI).then(() => {
        console.log("MongoDB connected successfully");    
    })
}

export default connectToDB;