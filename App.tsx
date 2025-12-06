import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChatMessage, HandlerResponse, PlayerInputMessage, Character } from './types';
import { generateHandlerResponse, generateSummary } from './services/geminiService';
import { BACKGROUND_IMAGES, INITIAL_HANDLER_MESSAGE } from './constants';
import ChatWindow from './components/ChatWindow';
import PlayerInput from './components/PlayerInput';
import Toolbar from './components/Toolbar';
import CampaignSetup from './components/CampaignSetup';
import { GameData } from './components/CampaignSetup';
import CharacterRoster from './components/CharacterRoster';

const App: React.FC = () => {
  const [gameLog, setGameLog] = useState<ChatMessage[]>([INITIAL_HANDLER_MESSAGE]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [context, setContext] = useState<string>('');
  const [backgroundImage, setBackgroundImage] = useState<string>(BACKGROUND_IMAGES[0]);
  const [currentChoices, setCurrentChoices] = useState<string[]>([]);
  const [isAwaitingRoll, setIsAwaitingRoll] = useState<boolean>(false);
  const [gameState, setGameState] = useState<'setup' | 'playing'>('setup');
  const [characters, setCharacters] = useState<Character[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [gameLog, isLoading]);

  const handleChoice = (choice: string) => {
    // When a choice is made, assume Agent 1 is acting unless specified otherwise
    const actingCharacter = characters[0] || { name: 'Agent 1', playerNumber: 1 };
    handlePlayerSubmit({ type: 'choice', content: choice, characterName: actingCharacter.name, playerNumber: 1 });
  };
  
  const processResponse = useCallback((response: HandlerResponse | null) => {
    if (response) {
      setGameLog(prev => [...prev, { sender: 'handler', content: response.narrative, choices: response.choices }]);
      setCurrentChoices(response.choices);
      setIsAwaitingRoll(response.awaitsRoll);
    } else {
      const errorResponse: ChatMessage = {
        sender: 'handler',
        content: "[OOC: An error occurred communicating with the Handler. Please try again.]",
        choices: currentChoices,
      };
      setGameLog(prev => [...prev, errorResponse]);
    }
  }, [currentChoices]);

  const handlePlayerSubmit = useCallback(async (message: PlayerInputMessage) => {
    const newLog: ChatMessage[] = [...gameLog, { sender: 'player', content: message.content, playerNumber: message.playerNumber, characterName: message.characterName }];
    setGameLog(newLog);
    setCurrentChoices([]);
    setIsAwaitingRoll(false);
    setIsLoading(true);

    try {
      const response = await generateHandlerResponse(newLog, context, characters);
      processResponse(response);
    } catch (error) {
      console.error("Gemini API call failed:", error);
      processResponse(null);
    } finally {
      setIsLoading(false);
    }
  }, [gameLog, context, processResponse, characters]);
  
  const handleGameStart = async (data: GameData) => {
    setCharacters(data.characters);

    let fullContext = "--- RULEBOOKS ---\n";
    fullContext += data.rulebooks + "\n\n";

    data.characters.forEach((char, index) => {
        fullContext += `--- CHARACTER SHEET: AGENT ${index + 1} (${char.name}) ---\n`;
        fullContext += char.sheet + "\n\n";
    });

    if (data.journal) {
        fullContext += "--- CAMPAIGN JOURNAL (STORY SO FAR) ---\n";
        fullContext += data.journal + "\n\n";
    }

    setContext(fullContext);
    setGameState('playing');
    
    // Make initial call to get the story started
    setIsLoading(true);
    setGameLog([]); // Clear "System online" message
    try {
        const response = await generateHandlerResponse([], fullContext, data.characters);
        processResponse(response);
    } catch (error) {
        console.error("Initial Gemini API call failed:", error);
        processResponse(null);
    } finally {
        setIsLoading(false);
    }
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
        <header className="w-full bg-black bg-opacity-50 backdrop-blur-sm p-3 flex justify-between items-center border-b border-gray-700 shadow-lg z-10">
          <h1 className="text-xl md:text-2xl font-bold text-green-400 font-special-elite tracking-wider">
            DELTA GREEN: <span className="text-gray-300">HANDLER AI</span>
          </h1>
          {gameState === 'playing' && (
            <Toolbar
                onChangeBackground={changeBackground}
                onSummaryRequest={handleSummaryRequest}
            />
          )}
        </header>
        
        {gameState === 'setup' ? (
          <div className="flex-grow flex items-center justify-center p-4 overflow-y-auto">
            <CampaignSetup onStartGame={handleGameStart} />
          </div>
        ) : (
          <div className="flex-grow flex overflow-hidden">
            <aside className="w-48 hidden md:block bg-black bg-opacity-20 border-r border-gray-800 p-4 overflow-y-auto">
              <CharacterRoster characters={characters} />
            </aside>
            <div className="flex-grow flex flex-col">
              <main className="flex-grow overflow-y-auto p-4 md:p-6 space-y-4">
                  <ChatWindow gameLog={gameLog} isLoading={isLoading} onChoice={handleChoice} />
                  <div ref={chatEndRef} />
              </main>
              <footer className="p-4 bg-black bg-opacity-30 backdrop-blur-sm border-t border-gray-800">
                <PlayerInput
                  onSubmit={handlePlayerSubmit}
                  isLoading={isLoading}
                  isAwaitingRoll={isAwaitingRoll}
                  characters={characters}
                />
              </footer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;