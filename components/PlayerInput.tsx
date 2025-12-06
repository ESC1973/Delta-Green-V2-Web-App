import React, { useState } from 'react';
import { PlayerInputMessage, Character } from '../types';

interface PlayerInputProps {
  onSubmit: (message: PlayerInputMessage) => void;
  isLoading: boolean;
  isAwaitingRoll: boolean;
  characters: Character[];
}

const PlayerInput: React.FC<PlayerInputProps> = ({ onSubmit, isLoading, isAwaitingRoll, characters }) => {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<'ic' | 'ooc'>('ic');
  const [activePlayer, setActivePlayer] = useState<number>(1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
        const characterName = characters[activePlayer - 1]?.name || `Agent ${activePlayer}`;
        const content = input;
        onSubmit({ 
            type: isAwaitingRoll ? 'roll' : mode, 
            content: content,
            playerNumber: activePlayer,
            characterName: characterName
        });
      setInput('');
    }
  };

  const isDisabled = isLoading;

  let placeholderText = "Describe your agent's action (IC) or ask a question (OOC)...";
  if (isAwaitingRoll) {
    placeholderText = "The Handler is waiting. Enter dice roll result and describe the action...";
  } else if (isLoading) {
    placeholderText = "Waiting for the Handler...";
  }


  return (
    <form onSubmit={handleSubmit} className="flex flex-col md:flex-row items-center gap-2">
      {characters.length > 0 && !isAwaitingRoll && (
          <select
            value={activePlayer}
            onChange={(e) => setActivePlayer(Number(e.target.value))}
            className="bg-gray-700 text-gray-300 rounded-md p-3 focus:outline-none w-full md:w-auto"
            disabled={isDisabled}
          >
            {characters.map((char, i) => (
                <option key={i + 1} value={i + 1}>{char.name}</option>
            ))}
          </select>
      )}
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
          placeholder={placeholderText}
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
        disabled={isDisabled || !input.trim()}
      >
        Send
      </button>
    </form>
  );
};

export default PlayerInput;