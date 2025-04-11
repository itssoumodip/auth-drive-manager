import mongoose from "mongoose";

const fileSchema = new mongoose.Schema({
    path: {
        type: String,
        require: [true, "File path is required"],
    },
    originalName: {
        type: String,
        require: [true, "File original name is required"],
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "users",
        require: [true, "File owner is required"],
    }
})

const file = mongoose.model('files', fileSchema);
export default file;