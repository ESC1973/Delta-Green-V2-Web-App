
import React from 'react';
import { ChatMessage } from '../types';

interface ChatWindowProps {
  gameLog: ChatMessage[];
  isLoading: boolean;
  onChoice: (choice: string) => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ gameLog, isLoading, onChoice }) => {
    
    const TypingIndicator: React.FC = () => (
        <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
        </div>
    );

  return (
    <div className="space-y-6">
      {gameLog.map((msg, index) => (
        <div key={index} className={`flex ${msg.sender === 'player' ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`max-w-xl lg:max-w-3xl p-4 rounded-lg shadow-md ${
              msg.sender === 'player'
                ? 'bg-gray-800 text-gray-300 rounded-br-none'
                : 'bg-gray-900 bg-opacity-50 border border-gray-700 text-gray-200 rounded-bl-none'
            }`}
          >
            <p className="whitespace-pre-wrap">{msg.content}</p>
            {msg.sender === 'handler' && msg.choices && msg.choices.length > 0 && index === gameLog.length - 1 && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-2">
                {msg.choices.map((choice, i) => (
                  <button
                    key={i}
                    onClick={() => onChoice(choice)}
                    className="w-full text-left bg-gray-700 hover:bg-green-800 text-green-300 font-semibold p-3 rounded-md transition-colors duration-200 text-sm"
                  >
                    {`> ${choice}`}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
      {isLoading && (
         <div className="flex justify-start">
            <div className="max-w-xl p-4 rounded-lg shadow-md bg-gray-900 bg-opacity-50 border border-gray-700 text-gray-200 rounded-bl-none">
                <TypingIndicator />
            </div>
         </div>
      )}
    </div>
  );
};

export default ChatWindow;
