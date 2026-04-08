import mongoose from "mongoose";

const RoomSchema = new mongoose.Schema({
    roomName: {
        type: String,
        trim: true,
    },
    host: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true,
    },
    meetType: {
        type: String,
        enum: ['instant', 'scheduled'],
        default: 'instant',
    },
    meetDate: {
        type: String,
    },
    meetTime: {
        type: String,
    },
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
    }],
    currentParticipants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
    }],
}, { timestamps: true });

const Rooms = mongoose.model("rooms", RoomSchema);
export default Rooms;