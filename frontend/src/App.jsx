import React, { useState } from 'react';
import QuizCreator from './components/QuizCreator';
import StudentJoin from './components/StudentJoin';

export default function App() {
  const [role, setRole] = useState('teacher'); // 'teacher' or 'student'

  return (
    <div className="min-h-screen w-full bg-slate-900 flex flex-col items-center justify-center p-4">
      
      {/* Role Switch Controller */}
      <div className="mb-6 flex bg-slate-800 p-1 rounded-xl border border-slate-700">
        <button
          onClick={() => setRole('teacher')}
          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            role === 'teacher' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          Educator Panel
        </button>
        <button
          onClick={() => setRole('student')}
          className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
            role === 'student' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          Student Portal
        </button>
      </div>

      <div className="text-center mb-6">
        <h1 className="text-4xl font-extrabold tracking-tight bg-linear-to-r from-blue-400 via-indigo-400 to-violet-500 bg-clip-text text-transparent mb-1">
          ⚡ Quizeria
        </h1>
        <p className="text-slate-400 text-xs">
          {role === 'teacher' ? 'Design and deploy AI generated live games.' : 'Enter your room pin to join the live session.'}
        </p>
      </div>
      
      {/* Conditional Portal Rendering */}
      {role === 'teacher' ? <QuizCreator /> : <StudentJoin />}
    </div>
  );
}