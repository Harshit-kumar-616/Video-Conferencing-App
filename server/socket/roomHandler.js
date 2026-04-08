import mongoose from 'mongoose';
import Rooms from '../models/Rooms.js';
import User from '../models/User.js';

const toObjectId = (id) => new mongoose.Types.ObjectId(id);

const roomHandler = (socket) => {

  // CREATE ROOM
  socket.on('create-room', async ({ userId, roomName, newMeetType, newMeetDate, newMeetTime }) => {
    try {
      const newRoom = new Rooms({
        roomName,
        host: toObjectId(userId),
        meetType: newMeetType,
        meetDate: newMeetDate,
        meetTime: newMeetTime,
        participants: [],
        currentParticipants: []
      });

      const room = await newRoom.save();
      // Let the creator join the room immediately
      socket.join(room._id.toString());

      socket.emit("room-created", { roomId: room._id, meetType: newMeetType });
    } catch (err) {
      console.error("Error creating room:", err);
      socket.emit("error", { message: "Failed to create room" });
    }
  });

  // JOIN ROOM BY CODE
  socket.on('user-code-join', async ({ roomId }) => {
    try {
      const room = await Rooms.findById(roomId);
      if (room) {
        socket.emit("room-exists", { roomId });
      } else {
        socket.emit("room-not-exist");
      }
    } catch (err) {
      console.error("Error joining room:", err);
      socket.emit("error", { message: "Failed to join room" });
    }
  });

  // REQUEST TO JOIN ROOM
  socket.on('request-to-join-room', async ({ roomId, userId }) => {
    try {
      const room = await Rooms.findById(roomId);
      if (!room) return socket.emit("room-not-exist");

      if (userId === room.host.toString()) {
        socket.emit('join-room', { roomId, userId });
      } else {
        socket.emit("requesting-host", { userId });
        socket.to(roomId).emit('user-requested-to-join', { participantId: userId, hostId: room.host });
      }
    } catch (err) {
      console.error("Error requesting to join:", err);
      socket.emit("error", { message: "Failed to request to join room" });
    }
  });

  // JOIN ROOM
  socket.on('join-room', async ({ roomId, userId }) => {
    try {
      await Rooms.updateOne(
        { _id: roomId },
        { $addToSet: { participants: toObjectId(userId), currentParticipants: toObjectId(userId) } }
      );
      socket.join(roomId);
      console.log(`User: ${userId} joined room: ${roomId}`);
      socket.to(roomId).emit("user-joined", { userId });
    } catch (err) {
      console.error("Error joining room:", err);
      socket.emit("error", { message: "Failed to join room" });
    }
  });

  // UPDATE PROFILE
  socket.on("update-profile", async ({ userId, username, email, avatar }) => {
    try {
      const updateData = {};
      if (username) updateData.username = username;
      if (email) updateData.email = email;
      if (avatar) updateData.avatar = avatar;

      await User.updateOne({ _id: userId }, { $set: updateData });
      console.log("Profile updated for user:", userId, updateData);
      socket.emit("profile-updated", { username, email, avatar });
    } catch (err) {
      console.error("Error updating profile:", err);
      socket.emit("error", { message: "Failed to update profile" });
    }
  });

  // GET PARTICIPANTS
  socket.on("get-participants", async ({ roomId }) => {
    try {
      const room = await Rooms.findById(roomId);
      if (!room) return;

      const participants = room.currentParticipants;
      const users = await User.find({ _id: { $in: participants } }, { _id: 1, username: 1 });

      const usernames = {};
      users.forEach(user => {
        usernames[user._id.toString()] = user.username;
      });

      socket.emit("participants-list", { usernames, roomName: room.roomName });
    } catch (err) {
      console.error("Error fetching participants:", err);
    }
  });

  // FETCH MY MEETS
  socket.on("fetch-my-meets", async ({ userId }) => {
    try {
      const meets = await Rooms.find(
        { host: userId },
        { _id: 1, roomName: 1, meetType: 1, meetDate: 1, meetTime: 1, createdAt: 1 }
      );
      socket.emit("meets-fetched", { myMeets: meets });
    } catch (err) {
      console.error("Error fetching meets:", err);
    }
  });

  // DELETE MEET
  socket.on("delete-meet", async ({ roomId }) => {
    try {
      await Rooms.deleteOne({ _id: roomId });
      socket.emit("room-deleted");
    } catch (err) {
      console.error("Error deleting meet:", err);
    }
  });

  // UPDATE MEET DETAILS
  socket.on("update-meet-details", async ({ roomId, roomName, newMeetDate, newMeetTime }) => {
    try {
      await Rooms.updateOne(
        { _id: roomId },
        { $set: { roomName, meetDate: newMeetDate, meetTime: newMeetTime } }
      );
      socket.emit("meet-details-updated");
    } catch (err) {
      console.error("Error updating meet details:", err);
    }
  });

  // USER LEFT ROOM
  socket.on("user-left-room", async ({ userId, roomId }) => {
    try {
      await Rooms.updateOne({ _id: roomId }, { $pull: { currentParticipants: toObjectId(userId) } });
      socket.leave(roomId);
    } catch (err) {
      console.error("Error leaving room:", err);
    }
  });

  // USER DISCONNECTED
  socket.on('user-disconnected', ({ userId, roomId }) => {
    console.log(`User: ${userId} disconnected from room: ${roomId}`);
  });

  // CHAT MESSAGE
  socket.on("new-chat", ({ msg, roomId }) => {
    try {
      // Broadcast only to the room
      socket.to(roomId).emit("new-chat-arrived", { msg, room: roomId });
      console.log(`New chat in room ${roomId}:`, msg);
    } catch (err) {
      console.error("Error broadcasting chat:", err);
    }
  });

};

export default roomHandler;
