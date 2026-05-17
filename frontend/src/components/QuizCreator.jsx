import React, { useState, useEffect } from 'react';
import { Sparkles, Plus, ListPlus, Loader2, Users, Play, ChevronRight, Trophy } from 'lucide-react';
import { socket } from '../socket';

export default function QuizCreator() {
  const [activeTab, setActiveTab] = useState('ai');
  const [quizTitle, setQuizTitle] = useState('');
  const [topic, setTopic] = useState('');
  
  // This state holds the user chosen question count
  const [numQuestions, setNumQuestions] = useState(5); 
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [activeRoomCode, setActiveRoomCode] = useState(null);
  
  const [connectedStudents, setConnectedStudents] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [subCount, setSubCount] = useState(0);
  const [finalLeaderboard, setFinalLeaderboard] = useState(null);

  useEffect(() => {
    if (activeRoomCode) {
      socket.connect();
      socket.emit('host_init_room', activeRoomCode);

      socket.on('lobby_updated', (list) => setConnectedStudents(list));

      socket.on('game_started', (blueprint) => {
        setGameStarted(true);
        setFinalLeaderboard(null);
        setCurrentQuestion(blueprint);
        setSubCount(0);
      });

      socket.on('answer_received', () => {
        setSubCount((prev) => prev + 1);
      });

      socket.on('new_question_loaded', (blueprint) => {
        setCurrentQuestion(blueprint);
        setSubCount(0);
      });

      socket.on('quiz_concluded', (leaderboardData) => {
        setFinalLeaderboard(leaderboardData);
      });
    }

    return () => {
      socket.off('lobby_updated');
      socket.off('game_started');
      socket.off('answer_received');
      socket.off('new_question_loaded');
      socket.off('quiz_concluded');
    };
  }, [activeRoomCode]);

  const handleAIGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // 1. Generate Quiz with dynamic title, topic, and count parameters passed to backend
      const quizRes = await fetch('https://quizeria-gxag.onrender.com/api/quizzes/generate-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: quizTitle, 
          topic: topic, 
          numQuestions: parseInt(numQuestions), // Sends the exact count picked by user
          creatorId: "teacher_dev" 
        })
      });

      const quizData = await quizRes.json();
      if (!quizRes.ok) throw new Error(quizData.error || 'Failed to generate quiz');

      // 2. Open the active live session room
      const roomRes = await fetch('https://quizeria-gxag.onrender.com/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId: quizData.quiz._id, hostId: "teacher_dev" })
      });
      
      const roomData = await roomRes.json();
      if (roomRes.ok) {
        setActiveRoomCode(roomData.roomCode);
      } else {
        throw new Error(roomData.message || 'Failed to open room');
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Server error encountered.' });
    } finally { 
      setLoading(false); 
    }
  };

  // RENDER LEVEL 3: Game Completed Podium Leaderboard
  if (finalLeaderboard) {
    return (
      <div className="w-full max-w-2xl bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl text-white text-center">
        <Trophy className="mx-auto text-amber-400 mb-2 animate-bounce" size={48} />
        <h2 className="text-3xl font-black mb-1">Quiz Finished!</h2>
        <p className="text-slate-400 text-sm mb-6">Final Room Standings</p>
        <div className="bg-slate-900 rounded-xl border border-slate-700 divide-y divide-slate-800 mb-6">
          {finalLeaderboard.map((student, index) => (
            <div key={index} className="flex justify-between items-center p-4">
              <div className="flex items-center gap-3">
                <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold ${index === 0 ? 'bg-amber-400 text-slate-950' : index === 1 ? 'bg-slate-300 text-slate-950' : 'bg-slate-700'}`}>{index + 1}</span>
                <span className="font-bold text-slate-200">{student.nickname}</span>
              </div>
              <span className="font-mono text-violet-400 font-bold">{student.score} pts</span>
            </div>
          ))}
        </div>
        <button onClick={() => { setActiveRoomCode(null); setFinalLeaderboard(null); setGameStarted(false); }} className="w-full bg-slate-700 hover:bg-slate-600 font-bold py-3 rounded-xl cursor-pointer">Back to Dashboard</button>
      </div>
    );
  }

  // RENDER LEVEL 2: Question Master Display
  if (gameStarted && currentQuestion) {
    return (
      <div className="w-full max-w-2xl bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl text-white">
        <div className="flex justify-between items-center text-xs font-bold uppercase tracking-widest text-slate-400 mb-6">
          <span>Question {currentQuestion.currentQuestionIndex + 1} of {currentQuestion.totalQuestions}</span>
          <span className="bg-emerald-500/20 text-emerald-400 px-2.5 py-1 rounded-md border border-emerald-500/30">Submissions: {subCount} / {connectedStudents.length}</span>
        </div>
        <h2 className="text-2xl font-black text-center mb-8">"{currentQuestion.questionText}"</h2>
        <div className="grid grid-cols-2 gap-4 mb-6">
          {currentQuestion.options.map((opt, idx) => (
            <div key={idx} className="p-4 bg-slate-900 border border-slate-700 rounded-xl font-bold text-center text-slate-400">{opt}</div>
          ))}
        </div>
        <button onClick={() => socket.emit('advance_question', activeRoomCode)} className="w-full bg-violet-600 hover:bg-violet-700 font-bold py-3 rounded-xl flex items-center justify-center gap-1 cursor-pointer shadow-lg">
          Next Slide <ChevronRight size={18} />
        </button>
      </div>
    );
  }

  // RENDER LEVEL 1: Roster Waiting Lobby
  if (activeRoomCode) {
    return (
      <div className="w-full max-w-2xl bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-2xl text-center text-white">
        <h2 className="text-xl font-bold text-slate-300 mb-1">Live Quiz Lobby Open</h2>
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-4 mb-6 text-4xl font-black text-violet-400 font-mono tracking-widest">{activeRoomCode}</div>
        <div className="mb-6 bg-slate-900/40 p-4 rounded-xl border text-left">
          <p className="text-xs font-bold uppercase text-slate-400 mb-3 flex items-center gap-1"><Users size={14} /> Connected Students ({connectedStudents.length})</p>
          {connectedStudents.length === 0 ? <p className="text-sm text-slate-500 italic">Waiting for players...</p> : (
            <div className="flex flex-wrap gap-2">{connectedStudents.map((s, i) => <span key={i} className="px-3 py-1 bg-violet-600/20 text-violet-300 rounded-lg text-sm font-bold">{s.nickname}</span>)}</div>
          )}
        </div>
        <div className="flex gap-4">
          <button onClick={() => setActiveRoomCode(null)} className="flex-1 bg-slate-700 py-3 rounded-xl cursor-pointer">End Session</button>
          <button onClick={() => socket.emit('start_quiz_session', activeRoomCode)} className="flex-1 bg-linear-to-r from-violet-600 to-indigo-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 cursor-pointer"><Play size={16} /> Start Game</button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl text-white">
      <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">🛠️ Create Your Quiz Room</h2>

      <div className="flex bg-slate-900 p-1 rounded-xl mb-6">
        <button
          type="button"
          onClick={() => setActiveTab('ai')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'ai' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sparkles size={16} /> Use AI Generator
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('manual')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'manual' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Plus size={16} /> Add Manually
        </button>
      </div>

      {message && (
        <div className="p-3 bg-rose-950/50 border border-rose-500 text-rose-400 text-xs rounded-xl mb-4">❌ {message.text}</div>
      )}

      <form onSubmit={handleAIGenerate} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">Quiz Title</label>
          <input type="text" required value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} placeholder="e.g., Physics Midterm" className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">Topic prompt</label>
          <textarea required value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Type a topic..." className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl resize-none" rows={3} />
        </div>

        {/* Dynamic Select Dropdown Input Box for choosing question length */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">Number of Questions</label>
          <select
            value={numQuestions}
            onChange={(e) => setNumQuestions(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer"
          >
            <option value={3}>3 Questions</option>
            <option value={5}>5 Questions</option>
            <option value={10}>10 Questions</option>
            <option value={15}>15 Questions</option>
          </select>
        </div>

        <button type="submit" disabled={loading} className="w-full bg-violet-600 py-3 rounded-xl font-bold cursor-pointer transition hover:bg-violet-700 disabled:bg-violet-800">
          {loading ? 'Generating via Gemini...' : 'Generate Live Quiz Room'}
        </button>
      </form>
    </div>
  );
}