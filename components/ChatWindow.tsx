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

    const parseMarkdown = (text: string) => {
        const bolded = text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-green-300 font-bold">$1</strong>');
        return { __html: bolded.replace(/\n/g, '<br />') };
    };

  return (
    <div className="space-y-6">
      {gameLog.map((msg, index) => {
        const isPlayer = msg.sender === 'player';
        const content = msg.content;

        return (
        <div key={index} className={`flex ${isPlayer ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`max-w-4xl p-4 rounded-lg shadow-md ${
              isPlayer
                ? 'bg-gray-800 text-gray-300 rounded-br-none'
                : 'bg-gray-900 bg-opacity-50 border border-gray-700 text-gray-200 rounded-bl-none'
            }`}
          >
            {isPlayer && msg.characterName && <div className="text-green-400 font-bold text-sm mb-1">{msg.characterName.toUpperCase()}</div>}
            <div className="whitespace-pre-wrap leading-relaxed" dangerouslySetInnerHTML={parseMarkdown(content)} />
            {msg.sender === 'handler' && msg.choices && msg.choices.length > 0 && index === gameLog.length - 1 && !isLoading && (
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
      )})}
      {isLoading && (
         <div className="flex justify-start">
            <div className="max-w-4xl p-4 rounded-lg shadow-md bg-gray-900 bg-opacity-50 border border-gray-700 text-gray-200 rounded-bl-none">
                <TypingIndicator />
            </div>
         </div>
      )}
    </div>
  );
};

export default ChatWindow;