import React, { useState, useEffect } from 'react';
import { LogIn, Loader2, CheckCircle } from 'lucide-react';
import { socket } from '../socket';

export default function StudentJoin() {
  const [roomCode, setRoomCode] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [joined, setJoined] = useState(false);
  
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [quizFinished, setQuizFinished] = useState(false);

  useEffect(() => {
    if (joined) {
      socket.connect();
      socket.emit('student_join_lobby', { roomCode: roomCode.replace(/\s+/g, ''), nickname });

      socket.on('game_started', (blueprint) => {
        setQuizFinished(false);
        setActiveQuestion(blueprint);
        setSelectedAnswer(null);
      });

      socket.on('new_question_loaded', (blueprint) => {
        setActiveQuestion(blueprint);
        setSelectedAnswer(null);
      });

      socket.on('quiz_concluded', () => {
        setQuizFinished(true);
        setActiveQuestion(null);
      });
    }

    return () => {
      socket.off('game_started');
      socket.off('new_question_loaded');
      socket.off('quiz_concluded');
    };
  }, [joined]);

  const handleJoin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const cleanCode = roomCode.replace(/\s+/g, '');

    try {
      const response = await fetch('https://quizeria-gxag.onrender.com/api/rooms/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomCode: cleanCode, nickname })
      });
      const data = await response.json();
      if (response.ok) setJoined(true);
      else setError(data.message || 'Failed to enter room.');
    } catch (err) { setError('Connection error.'); }
    finally { setLoading(false); }
  };

  const handleAnswerSubmit = (optionText) => {
    if (selectedAnswer) return; // Locked out from double clicking
    setSelectedAnswer(optionText);

    // Emit the answer evaluation request via WebSockets
    socket.emit('submit_answer', {
      roomCode: roomCode.replace(/\s+/g, ''),
      nickname,
      answer: optionText
    });
  };

  // STATE 4: Final Game Over Renders
  if (quizFinished) {
    return (
      <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center text-white shadow-xl">
        <div className="text-4xl mb-3">🏆</div>
        <h2 className="text-2xl font-black text-amber-400 mb-2">Game Over!</h2>
        <p className="text-slate-400 text-sm">Look up at the educator's presentation screen to see the final winner podium standings!</p>
      </div>
    );
  }

  // STATE 3: Lock Overlay Between Question Renders
  if (joined && activeQuestion && selectedAnswer) {
    return (
      <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center text-white shadow-xl">
        <CheckCircle className="mx-auto text-emerald-400 mb-3 animate-pulse" size={40} />
        <h3 className="text-xl font-bold mb-1">Answer Submitted!</h3>
        <p className="text-slate-400 text-xs">Waiting for the educator to move to the next slide sequence...</p>
        <div className="mt-4 p-3 bg-slate-950 rounded-xl text-sm font-mono border border-slate-700 text-slate-300">
          Your pick: "{selectedAnswer}"
        </div>
      </div>
    );
  }

  // STATE 2: Interactive Input Buttons
  if (joined && activeQuestion) {
    return (
      <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl p-6 text-white shadow-xl">
        <div className="text-center mb-4">
          <span className="bg-violet-600/30 text-violet-400 font-bold px-3 py-1 rounded-full text-xs">Question {activeQuestion.currentQuestionIndex + 1}</span>
        </div>
        <h3 className="text-xl font-bold text-center mb-6">{activeQuestion.questionText}</h3>
        <div className="space-y-3">
          {activeQuestion.options.map((opt, idx) => (
            <button
              key={idx}
              onClick={() => handleAnswerSubmit(opt)}
              className="w-full text-left p-4 bg-slate-900 border border-slate-700 rounded-xl font-semibold hover:border-violet-500 transition cursor-pointer"
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // STATE 1: Waiting Lobby Screen
  if (joined) {
    return (
      <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center text-white shadow-xl">
        <div className="text-4xl mb-3 animate-bounce">🎮</div>
        <h2 className="text-2xl font-black text-violet-400 mb-2">You're in the Lobby!</h2>
        <p className="text-slate-400 text-sm">Hey <span className="text-white font-bold">{nickname}</span>, wait for the educator to press Start...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl text-white">
      <h2 className="text-xl font-bold mb-4 text-center">👋 Join an Active Quiz</h2>
      {error && <div className="p-3 bg-rose-950/50 border border-rose-500 text-rose-400 text-xs rounded-xl mb-4">❌ {error}</div>}
      <form onSubmit={handleJoin} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-2">6-Digit Room PIN</label>
          <input type="text" required value={roomCode} onChange={(e) => setRoomCode(e.target.value)} placeholder="e.g., 482910" className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-center text-xl font-black text-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-2">Nickname</label>
          <input type="text" required maxLength={12} value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="e.g., Alex_Dev" className="w-full px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl" />
        </div>
        <button type="submit" disabled={loading} className="w-full bg-linear-to-r from-violet-600 to-indigo-600 text-white font-bold py-3 rounded-xl shadow-lg">{loading ? <Loader2 className="animate-spin" size={18} /> : 'Enter Lobby'}</button>
      </form>
    </div>
  );
}