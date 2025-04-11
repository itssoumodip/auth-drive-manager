import mongoose from "mongoose";

function connectToDB() {
    mongoose.connect(process.env.MONGO_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }).then(() => {
        console.log("MongoDB connected successfully");    
    }).catch((err) => {
        console.error("MongoDB connection failed:", err);
    });
}

export default connectToDB;
