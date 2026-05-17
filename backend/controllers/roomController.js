const Room = require('../models/Room');
const Quiz = require('../models/Quiz');

// Helper function to generate a random 6-digit code string
const generateUniqueCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

exports.createRoom = async (req, res) => {
  try {
    const { quizId, hostId } = req.body;

    if (!quizId || !hostId) {
      return res.status(400).json({ message: 'Missing quizId or hostId' });
    }

    // Verify the quiz actually exists first
    const quizExists = await Quiz.findById(quizId);
    if (!quizExists) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Generate a code and ensure it's unique
    let roomCode = generateUniqueCode();
    let existingRoom = await Room.findOne({ roomCode, status: { $ne: 'FINISHED' } });
    
    while (existingRoom) {
      roomCode = generateUniqueCode();
      existingRoom = await Room.findOne({ roomCode, status: { $ne: 'FINISHED' } });
    }

    // Create the active room session
    const newRoom = new Room({
      roomCode,
      quizId,
      hostId,
      status: 'LOBBY',
      currentQuestionIndex: 0,
      students: []
    });

    await newRoom.save();

    res.status(201).json({
      message: 'Live room opened successfully!',
      roomCode: newRoom.roomCode,
      roomId: newRoom._id
    });

  } catch (error) {
    console.error('❌ Error creating room:', error);
    res.status(500).json({ error: 'Failed to initialize live room session' });
  }
};

exports.joinRoom = async (req, res) => {
  try {
    const { roomCode, nickname } = req.body;

    if (!roomCode || !nickname) {
      return res.status(400).json({ message: 'Room code and nickname are required' });
    }

    // Find an active room with this code
    const room = await Room.findOne({ roomCode, status: 'LOBBY' });

    if (!room) {
      return res.status(444).json({ message: 'Room not found or quiz has already started!' });
    }

    // Check if the nickname is already taken in this specific room
    const nameExists = room.students.some(student => student.nickname.toLowerCase() === nickname.toLowerCase());
    if (nameExists) {
      return res.status(400).json({ message: 'This nickname is taken inside this room!' });
    }

    // For now, we manually push the student into the database array
    // (In the next step, Socket.io will handle this dynamically in real-time!)
    room.students.push({
      nickname,
      score: 0,
      socketId: 'temp_id_' + Math.random().toString(36).substr(2, 9)
    });

    await room.save();

    res.status(200).json({
      message: 'Joined lobby successfully!',
      roomCode: room.roomCode,
      nickname: nickname
    });

  } catch (error) {
    console.error('❌ Error joining room:', error);
    res.status(500).json({ error: 'Failed to join the quiz room' });
  }
};