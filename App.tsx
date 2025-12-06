
import React, { useState, useEffect, useRef, useCallback } from 'react';
// Fix: Changed PlayerMessage to PlayerInputMessage as it's the correct exported type.
import { ChatMessage, HandlerResponse, PlayerInputMessage } from './types';
import { generateHandlerResponse, generateSummary } from './services/geminiService';
import { BACKGROUND_IMAGES, INITIAL_HANDLER_MESSAGE } from './constants';
import ChatWindow from './components/ChatWindow';
import PlayerInput from './components/PlayerInput';
import Toolbar from './components/Toolbar';
import FileUpload from './components/FileUpload';

const App: React.FC = () => {
  const [gameLog, setGameLog] = useState<ChatMessage[]>([INITIAL_HANDLER_MESSAGE]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [context, setContext] = useState<string>('');
  const [backgroundImage, setBackgroundImage] = useState<string>(BACKGROUND_IMAGES[0]);
  const [currentChoices, setCurrentChoices] = useState<string[]>(INITIAL_HANDLER_MESSAGE.choices || []);
  const [isAwaitingRoll, setIsAwaitingRoll] = useState<boolean>(false);
  const [showFileUpload, setShowFileUpload] = useState<boolean>(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [gameLog, isLoading]);
  
  const handleChoice = (choice: string) => {
     handlePlayerSubmit({ type: 'choice', content: choice });
  };

  const processResponse = useCallback((response: HandlerResponse | null) => {
    if (response) {
      setGameLog(prev => [...prev, { sender: 'handler', content: response.narrative, choices: response.choices }]);
      setCurrentChoices(response.choices);
      setIsAwaitingRoll(response.awaitsRoll);
    } else {
      const errorResponse: ChatMessage = {
        sender: 'handler',
        content: "[OOC: An error occurred communicating with the Handler. Please check your API key and network connection, then try again.]",
        choices: currentChoices,
      };
      setGameLog(prev => [...prev, errorResponse]);
    }
  }, [currentChoices]);

  const handlePlayerSubmit = useCallback(async (message: PlayerInputMessage) => {
    const newLog: ChatMessage[] = [...gameLog, { sender: 'player', content: message.content }];
    setGameLog(newLog);
    setCurrentChoices([]);
    setIsAwaitingRoll(false);
    setIsLoading(true);

    try {
      const response = await generateHandlerResponse(newLog, context);
      processResponse(response);
    } catch (error) {
      console.error("Gemini API call failed:", error);
      processResponse(null);
    } finally {
      setIsLoading(false);
    }
  }, [gameLog, context, processResponse]);

  const handleFileUpload = (content: string) => {
    setContext(content);
    setShowFileUpload(false);
    handlePlayerSubmit({ type: 'ooc', content: '[OOC: Rulebooks uploaded. I am ready to begin the operation.]' });
  };

  const handleSummaryRequest = async () => {
    setIsLoading(true);
    try {
      const summary = await generateSummary(gameLog, context);
      const summaryMessage: ChatMessage = {
        sender: 'handler',
        content: `[OOC: SESSION SUMMARY]\n\n${summary}`,
        choices: currentChoices
      };
      setGameLog(prev => [...prev, summaryMessage]);
    } catch (error) {
      console.error("Summary generation failed:", error);
       const errorResponse: ChatMessage = {
        sender: 'handler',
        content: "[OOC: Failed to generate summary.]",
        choices: currentChoices
      };
      setGameLog(prev => [...prev, errorResponse]);
    }
    setIsLoading(false);
  };

  const handleSummaryUpload = (summaryContent: string) => {
     const summaryMessage: ChatMessage = {
        sender: 'player',
        content: `[OOC: Uploaded previous session summary for context.]\n\n---SUMMARY START---\n${summaryContent}\n---SUMMARY END---`,
     };
     handlePlayerSubmit({type: 'ooc', content: summaryMessage.content});
  };

  const changeBackground = () => {
    const currentIndex = BACKGROUND_IMAGES.indexOf(backgroundImage);
    const nextIndex = (currentIndex + 1) % BACKGROUND_IMAGES.length;
    setBackgroundImage(BACKGROUND_IMAGES[nextIndex]);
  };

  return (
    <div
      className="h-screen w-screen bg-cover bg-center bg-fixed transition-all duration-1000"
      style={{ backgroundImage: `url(${backgroundImage})` }}
    >
      <div className="h-full w-full bg-black bg-opacity-70 flex flex-col">
        <header className="w-full bg-black bg-opacity-50 backdrop-blur-sm p-3 flex justify-between items-center border-b border-gray-700 shadow-lg">
          <h1 className="text-xl md:text-2xl font-bold text-green-400 font-special-elite tracking-wider">
            DELTA GREEN: <span className="text-gray-300">HANDLER AI</span>
          </h1>
          <Toolbar
            onChangeBackground={changeBackground}
            onSummaryRequest={handleSummaryRequest}
            onSummaryUpload={handleSummaryUpload}
          />
        </header>
        
        {showFileUpload && (
          <div className="flex-grow flex items-center justify-center p-4">
            <FileUpload onFileUpload={handleFileUpload} />
          </div>
        )}

        {!showFileUpload && (
          <>
            <main className="flex-grow overflow-y-auto p-4 md:p-6 space-y-4">
                <ChatWindow gameLog={gameLog} isLoading={isLoading} onChoice={handleChoice} />
                <div ref={chatEndRef} />
            </main>
            <footer className="p-4 bg-black bg-opacity-30 backdrop-blur-sm border-t border-gray-800">
              <PlayerInput
                onSubmit={handlePlayerSubmit}
                isLoading={isLoading}
                isAwaitingRoll={isAwaitingRoll}
                hasChoices={currentChoices.length > 0}
              />
            </footer>
          </>
        )}
      </div>
    </div>
  );
};

export default App;
