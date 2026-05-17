const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();
const connectDB = require('./db');
const Room = require('./models/Room');

const { generateAIQuiz } = require('./controllers/quizController');
const { createRoom, joinRoom } = require('./controllers/roomController');

const app = express();
app.use(cors({
     origin: "*", // Allows any frontend domain (like localhost or Vercel) to make API requests
     methods: ["GET", "POST"]
   }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] }
});

connectDB();

// REST API Endpoints
app.get('/', (req, res) => res.send('Quizeria Engine Running'));
app.post('/api/quizzes/generate-ai', generateAIQuiz);
app.post('/api/rooms/create', createRoom);
app.post('/api/rooms/join', joinRoom);

// --- Real-time Socket.io Orchestration ---
io.on('connection', (socket) => {
  console.log(`🔌 Connected: ${socket.id}`);

  socket.on('host_init_room', (roomCode) => {
    socket.join(roomCode);
  });

  socket.on('student_join_lobby', async ({ roomCode, nickname }) => {
    socket.join(roomCode);
    const room = await Room.findOne({ roomCode });
    if (room) {
      // Bind their active socketId to their student profile entry
      await Room.updateOne(
        { roomCode, "students.nickname": nickname },
        { $set: { "students.$.socketId": socket.id } }
      );
      const updatedRoom = await Room.findOne({ roomCode });
      io.to(roomCode).emit('lobby_updated', updatedRoom.students);
    }
  });

  socket.on('start_quiz_session', async (roomCode) => {
    const room = await Room.findOne({ roomCode }).populate('quizId');
    if (!room) return;

    room.status = 'ACTIVE';
    room.currentQuestionIndex = 0;
    await room.save();

    const firstQuestion = room.quizId.questions[0];
    io.to(roomCode).emit('game_started', {
      questionText: firstQuestion.questionText,
      options: firstQuestion.options,
      currentQuestionIndex: 0,
      totalQuestions: room.quizId.questions.length,
      answersSubmitted: 0
    });
  });

  // NEW EVENT: Student submits an answer choice
  socket.on('submit_answer', async ({ roomCode, nickname, answer }) => {
    try {
      const room = await Room.findOne({ roomCode }).populate('quizId');
      if (!room || room.status !== 'ACTIVE') return;

      const currentIdx = room.currentQuestionIndex;
      const currentQuestion = room.quizId.questions[currentIdx];

      // Evaluation Engine logic
      const isCorrect = currentQuestion.correctAnswer.trim() === answer.trim();
      const pointsAwarded = isCorrect ? 100 : 0;

      // Update student score inside MongoDB array
      await Room.updateOne(
        { roomCode, "students.nickname": nickname },
        { $inc: { "students.$.score": pointsAwarded } }
      );

      // Notify the host that a submission came in
      io.to(roomCode).emit('answer_received', { nickname });
    } catch (err) {
      console.error(err);
    }
  });

  // NEW EVENT: Host requests the next slide sequence
  socket.on('advance_question', async (roomCode) => {
    const room = await Room.findOne({ roomCode }).populate('quizId');
    if (!room) return;

    const nextIdx = room.currentQuestionIndex + 1;
    const totalQuestions = room.quizId.questions.length;

    if (nextIdx < totalQuestions) {
      // Move to next question slide
      room.currentQuestionIndex = nextIdx;
      await room.save();

      const nextQuestion = room.quizId.questions[nextIdx];
      io.to(roomCode).emit('new_question_loaded', {
        questionText: nextQuestion.questionText,
        options: nextQuestion.options,
        currentQuestionIndex: nextIdx,
        totalQuestions: totalQuestions
      });
    } else {
      // Quiz has concluded! Process final standings leaderboard sorting
      room.status = 'FINISHED';
      await room.save();

      const sortedLeaderboard = room.students.sort((a, b) => b.score - a.score);
      io.to(roomCode).emit('quiz_concluded', sortedLeaderboard);
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ Disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Quizeria Server running on port ${PORT}`));