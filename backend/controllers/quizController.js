const { GoogleGenAI, Type } = require('@google/genai');
const Quiz = require('../models/Quiz');

// Initialize the Gemini client using the environment key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// --- AI GENERATION CONTROLLER ---
exports.generateAIQuiz = async (req, res) => {
  try {
    const { topic, numQuestions, creatorId, title } = req.body;

    if (!topic || !creatorId || !title) {
      return res.status(400).json({ error: 'Missing required fields: topic, title, or creatorId' });
    }

    const count = numQuestions || 5;

    // Define the rigid JSON schema we want Gemini to reply with
    const quizSchema = {
      type: Type.ARRAY,
      description: 'List of multiple choice quiz questions',
      items: {
        type: Type.OBJECT,
        properties: {
          questionText: { type: Type.STRING, description: 'The question being asked.' },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'Exactly 4 distinct multiple choice answer options.'
          },
          correctAnswer: { type: Type.STRING, description: 'The exact string value matching one of the options elements.' },
          timeLimit: { type: Type.INTEGER, description: 'Time allowed in seconds, defaults to 30.' }
        },
        required: ['questionText', 'options', 'correctAnswer', 'timeLimit'],
      },
    };

    // Call the fast, lightweight flash model
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Generate a highly accurate ${count}-question multiple choice quiz about the topic: "${topic}".`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: quizSchema,
        temperature: 0.7,
      },
    });

    // Parse the safe structured JSON text string returned from Gemini
    const generatedQuestions = JSON.parse(response.text);

    // Save the brand new AI-generated quiz directly into MongoDB
    const newQuiz = new Quiz({
      title,
      creatorId,
      questions: generatedQuestions
    });

    await newQuiz.save();

    res.status(201).json({
      message: 'Quiz generated and saved successfully!',
      quiz: newQuiz
    });

  } catch (error) {
    console.error('❌ AI Generation Error Details:', error);
    res.status(500).json({ 
      error: 'Failed to generate quiz via AI', 
      details: error.message 
    });
  }
};

// --- MANUAL CREATION CONTROLLER ---
exports.createManualQuiz = async (req, res) => {
  try {
    const { title, questions, creatorId } = req.body;

    if (!title || !questions || questions.length === 0) {
      return res.status(400).json({ error: "Title and questions are required." });
    }

    // Format and validate incoming questions array to match our Mongoose Schema
    const formattedQuestions = questions.map((q) => ({
      questionText: q.questionText,
      options: [q.optionA, q.optionB, q.optionC, q.optionD],
      correctAnswer: q.correctAnswer,
      timeLimit: 30 // standard default time limit
    }));

    const newQuiz = new Quiz({
      title,
      questions: formattedQuestions,
      creatorId: creatorId || "teacher_dev"
    });

    await newQuiz.save();
    res.status(201).json({ quiz: newQuiz });
  } catch (err) {
    console.error("❌ Manual Creation Error:", err);
    res.status(500).json({ error: "Failed to create manual quiz.", details: err.message });
  }
};