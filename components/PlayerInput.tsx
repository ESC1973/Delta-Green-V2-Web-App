
import React, { useState } from 'react';
import { PlayerInputMessage } from '../types';

interface PlayerInputProps {
  onSubmit: (message: PlayerInputMessage) => void;
  isLoading: boolean;
  isAwaitingRoll: boolean;
  hasChoices: boolean;
}

const PlayerInput: React.FC<PlayerInputProps> = ({ onSubmit, isLoading, isAwaitingRoll, hasChoices }) => {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'ic' | 'ooc'>('ic');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSubmit({ type: isAwaitingRoll ? 'roll' : mode, content: `[${mode.toUpperCase()}] ${input}` });
      setInput('');
    }
  };

  const isDisabled = isLoading || hasChoices;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col md:flex-row items-center gap-2">
      <div className="relative flex-grow w-full">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
              }
          }}
          placeholder={
            isAwaitingRoll 
              ? "The Handler is waiting. Enter your dice roll result and describe the action..." 
              : isDisabled 
                ? "Select a choice above or wait for the Handler..." 
                : "Describe your agent's action (IC) or ask a question (OOC)..."
          }
          className="w-full p-3 pr-24 bg-gray-800 border border-gray-600 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all text-gray-200 resize-none"
          rows={1}
          disabled={isDisabled}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
            {!isAwaitingRoll && (
                 <select 
                    value={mode} 
                    onChange={(e) => setMode(e.target.value as 'ic' | 'ooc')}
                    className="bg-gray-700 text-gray-300 rounded-md p-1 text-xs focus:outline-none"
                    disabled={isDisabled}
                  >
                    <option value="ic">IC</option>
                    <option value="ooc">OOC</option>
                  </select>
            )}
             {isAwaitingRoll && (
                <span className="bg-yellow-800 text-yellow-200 text-xs font-bold mr-2 px-2.5 py-0.5 rounded">ROLL</span>
             )}
        </div>
      </div>
      <button
        type="submit"
        className="w-full md:w-auto px-6 py-3 bg-green-600 text-white font-bold rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
        disabled={isDisabled}
      >
        Send
      </button>
    </form>
  );
};

export default PlayerInput;
