const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  roomCode: { type: String, required: true, unique: true }, // e.g., "582914"
  quizId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz', required: true },
  hostId: { type: String, required: true }, // The teacher running the room
  status: { type: String, enum: ['LOBBY', 'ACTIVE', 'FINISHED'], default: 'LOBBY' },
  currentQuestionIndex: { type: Number, default: 0 },
  students: [
    {
      socketId: { type: String }, // Used later to track their active WebSocket connection
      nickname: { type: String, required: true },
      score: { type: Number, default: 0 }
    }
  ],
  createdAt: { type: Date, default: Date.now, expires: 86400 } // Automatically deletes room document after 24 hours
});

module.exports = mongoose.model('Room', RoomSchema);