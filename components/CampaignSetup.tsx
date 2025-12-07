import React, { useState, useMemo } from 'react';
import { UploadIcon } from './Icons';
import { Character } from '../types';
import { PLACEHOLDER_IMAGE } from '../constants';

export interface GameData {
  characters: Character[];
  journal: string | null;
  rulebooks: string;
  // FIX: Add mythicRulebook to GameData type to support optional Mythic GME rulebook file.
  mythicRulebook: string | null;
}

interface CampaignSetupProps {
  onStartGame: (data: GameData) => void;
}

const readFileAsText = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsText(file);
    });
};

const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

const parseNameFromSheet = (sheetContent: string): string => {
    if (!sheetContent) return "";
    // Clean content of non-standard characters like form feed, which can come from PDF copies
    const cleanedContent = sheetContent.replace(/\f/g, ''); 
    const lines = cleanedContent.split('\n');
    
    const nameLabelIndex = lines.findIndex(line => 
        line.toUpperCase().includes('LAST NAME, FIRST NAME')
    );

    if (nameLabelIndex !== -1 && nameLabelIndex + 1 < lines.length) {
        // The name is usually on the line directly after the label.
        const nameLine = lines[nameLabelIndex + 1].trim();
        if (nameLine) {
            // Basic cleanup for names, removing potential numbering like "1. "
            return nameLine.replace(/^\d+\.\s*/, '').trim();
        }
    }
    
    // Fallback for "NAME: ..." format
    const nameLineDirect = lines.find(line => line.toUpperCase().startsWith('NAME:'));
    if (nameLineDirect) {
        return nameLineDirect.substring(5).trim();
    }

    return "";
};

const CampaignSetup: React.FC<CampaignSetupProps> = ({ onStartGame }) => {
    const [mode, setMode] = useState<'new' | 'continue' | null>(null);
    const [playerCount, setPlayerCount] = useState<number>(1);
    const [charData, setCharData] = useState<{sheet: File | null, image: File | null, name: string}[]>(Array(1).fill({sheet: null, image: null, name: ''}));
    const [journalFile, setJournalFile] = useState<File | null>(null);
    // FIX: Add state to manage the uploaded Mythic GME rulebook file.
    const [mythicRulebookFile, setMythicRulebookFile] = useState<File | null>(null);
    const [rulebookFiles, setRulebookFiles] = useState<File[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const handlePlayerCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const count = Math.max(1, Math.min(8, Number(e.target.value)));
        setPlayerCount(count);
        setCharData(current => {
            const newData = Array(count).fill({}).map(() => ({sheet: null, image: null, name: ''}));
            for(let i=0; i< Math.min(current.length, count); i++) {
                newData[i] = current[i];
            }
            return newData;
        });
    };

    const handleCharFileChange = async (index: number, type: 'sheet' | 'image', file: File | null) => {
        const newData = [...charData];
        newData[index] = {...newData[index], [type]: file};
        if (type === 'sheet' && file) {
            try {
                const sheetContent = await readFileAsText(file);
                const parsedName = parseNameFromSheet(sheetContent);
                newData[index].name = parsedName;
            } catch (e) {
                console.error("Error reading sheet file:", e);
                newData[index].name = "";
            }
        }
        setCharData(newData);
    };
    
    const handleNameChange = (index: number, name: string) => {
        const newData = [...charData];
        newData[index].name = name;
        setCharData(newData);
    };

    const requirements = useMemo(() => {
        let reqs: {label: string, met: boolean}[] = [];
        if (!mode) return reqs;

        reqs.push({ label: 'At least one rulebook file', met: rulebookFiles.length > 0 });
        if (mode === 'continue') {
            reqs.push({ label: 'A campaign journal file', met: journalFile !== null });
        }
        charData.forEach((data, i) => {
            reqs.push({ label: `Agent ${i+1}: Name is entered`, met: data.name.trim() !== '' });
            reqs.push({ label: `Agent ${i+1}: Character sheet is uploaded`, met: data.sheet !== null });
        });
        return reqs;
    }, [mode, rulebookFiles, journalFile, charData]);

    const isReady = useMemo(() => requirements.every(r => r.met), [requirements]);

    const handleStart = async () => {
        if (!isReady) return;
        setIsProcessing(true);
        try {
            const rulebooks = (await Promise.all(rulebookFiles.map(readFileAsText))).join('\n\n--- END OF FILE ---\n\n');
            
            const characters: Character[] = await Promise.all(charData.map(async (data) => {
                const sheet = await readFileAsText(data.sheet!);
                const imageUrl = data.image ? await readFileAsDataURL(data.image) : PLACEHOLDER_IMAGE;
                return { name: data.name.trim(), sheet, imageUrl };
            }));

            const journal = journalFile ? await readFileAsText(journalFile) : null;
            // FIX: Read content from mythic rulebook file if it exists.
            const mythicRulebook = mythicRulebookFile ? await readFileAsText(mythicRulebookFile) : null;
            
            // FIX: Pass mythicRulebook to onStartGame.
            onStartGame({ characters, journal, rulebooks, mythicRulebook });
        } catch (error) {
            console.error("Error processing files:", error);
            alert("There was an error reading the files. Please try again.");
            setIsProcessing(false);
        }
    };
    
  return (
    <div className="w-full max-w-2xl p-6 md:p-8 bg-gray-800 bg-opacity-80 backdrop-blur-md border border-gray-700 rounded-lg shadow-2xl text-gray-300">
      <h2 className="text-2xl font-bold text-green-400 font-special-elite mb-4 text-center">CAMPAIGN SETUP</h2>
      
      {!mode ? (
        <div className="flex flex-col md:flex-row gap-4 mt-6">
          <button onClick={() => setMode('new')} className="flex-1 p-4 bg-green-700 hover:bg-green-600 rounded-md text-white font-bold transition-colors text-lg">New Campaign</button>
          <button onClick={() => setMode('continue')} className="flex-1 p-4 bg-gray-700 hover:bg-gray-600 rounded-md text-white font-bold transition-colors text-lg">Continue Campaign</button>
        </div>
      ) : (
        <div className="space-y-4">
            <button onClick={() => setMode(null)} className="text-sm text-green-400 hover:underline">{'< Back'}</button>
            <h3 className="text-xl font-bold text-center capitalize font-special-elite">{mode} Campaign</h3>

            <div>
                <label htmlFor="player-count" className="block text-sm font-medium text-gray-300">Number of Player Characters (1-8)</label>
                <input id="player-count" type="number" min="1" max="8" value={playerCount} onChange={handlePlayerCountChange} className="mt-1 w-full p-2 bg-gray-700 border border-gray-600 rounded-md"/>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 border-t border-b border-gray-700 py-2">
                {Array.from({ length: playerCount }).map((_, i) => (
                  <div key={i} className="p-2 border border-gray-600 rounded-md my-2">
                      <p className="font-bold text-center text-green-400">Agent {i+1}</p>
                      
                       <div className="py-2">
                          <label className="block text-xs font-medium text-gray-400 mb-1">Sheet (.txt)</label>
                          <label htmlFor={`char-sheet-${i}`} className="w-full text-sm p-2 bg-gray-700 border border-gray-600 rounded-md flex items-center justify-between cursor-pointer hover:bg-gray-600">
                              <span className="text-gray-300 truncate pr-2">{charData[i]?.sheet?.name || 'No file selected'}</span>
                              <UploadIcon className="w-5 h-5 text-green-400 flex-shrink-0"/>
                          </label>
                          <input id={`char-sheet-${i}`} type="file" className="sr-only" accept=".txt" onChange={e => handleCharFileChange(i, 'sheet', e.target.files?.[0] || null)} />
                      </div>

                       <div className="py-2">
                          <label className="block text-xs font-medium text-gray-400 mb-1">Portrait (image - optional)</label>
                          <label htmlFor={`char-image-${i}`} className="w-full text-sm p-2 bg-gray-700 border border-gray-600 rounded-md flex items-center justify-between cursor-pointer hover:bg-gray-600">
                              <span className="text-gray-300 truncate pr-2">{charData[i]?.image?.name || 'No file selected'}</span>
                              <UploadIcon className="w-5 h-5 text-green-400 flex-shrink-0"/>
                          </label>
                          <input id={`char-image-${i}`} type="file" className="sr-only" accept="image/*" onChange={e => handleCharFileChange(i, 'image', e.target.files?.[0] || null)} />
                      </div>

                      <div>
                        <label htmlFor={`char-name-${i}`} className="block text-xs font-medium text-gray-400 mb-1">Agent Name</label>
                        <input id={`char-name-${i}`} type="text" value={charData[i]?.name} onChange={e => handleNameChange(i, e.target.value)} placeholder="Type name or upload sheet to auto-fill" className="mt-1 w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-sm"/>
                      </div>
                  </div>
                ))}
            </div>

            {mode === 'continue' && (
                <div className="py-2">
                    <label className="block text-xs font-medium text-gray-400 mb-1">Campaign Journal (.txt)</label>
                    <label htmlFor="journal-file" className="w-full text-sm p-2 bg-gray-700 border border-gray-600 rounded-md flex items-center justify-between cursor-pointer hover:bg-gray-600">
                        <span className="text-gray-300 truncate pr-2">{journalFile?.name || 'No file selected'}</span>
                        <UploadIcon className="w-5 h-5 text-green-400 flex-shrink-0"/>
                    </label>
                    <input id="journal-file" type="file" className="sr-only" accept=".txt" onChange={e => setJournalFile(e.target.files?.[0] || null)} />
                </div>
            )}

            {/* FIX: Add file input for optional Mythic GME rulebook. */}
            <div className="py-2">
                <label className="block text-xs font-medium text-gray-400 mb-1">Mythic GME Rulebook (.txt - optional)</label>
                <label htmlFor="mythic-rulebook-file" className="w-full text-sm p-2 bg-gray-700 border border-gray-600 rounded-md flex items-center justify-between cursor-pointer hover:bg-gray-600">
                    <span className="text-gray-300 truncate pr-2">{mythicRulebookFile?.name || 'No file selected'}</span>
                    <UploadIcon className="w-5 h-5 text-green-400 flex-shrink-0"/>
                </label>
                <input id="mythic-rulebook-file" type="file" className="sr-only" accept=".txt" onChange={e => setMythicRulebookFile(e.target.files?.[0] || null)} />
            </div>

            <div className="py-2">
                <label className="block text-xs font-medium text-gray-400 mb-1">Rulebook(s) (.txt)</label>
                <label htmlFor="rulebook-files" className="w-full text-sm p-2 bg-gray-700 border border-gray-600 rounded-md flex items-center justify-between cursor-pointer hover:bg-gray-600">
                    <span className="text-gray-300 truncate pr-2">{rulebookFiles.length > 0 ? `${rulebookFiles.length} file(s) selected` : 'No files selected'}</span>
                    <UploadIcon className="w-5 h-5 text-green-400 flex-shrink-0"/>
                </label>
                <input id="rulebook-files" type="file" className="sr-only" accept=".txt" multiple onChange={e => setRulebookFiles(e.target.files ? Array.from(e.target.files) : [])} />
            </div>
          
            <button
                onClick={handleStart}
                disabled={!isReady || isProcessing}
                className="w-full mt-4 p-4 bg-green-600 hover:bg-green-700 rounded-md text-white font-bold transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed text-lg"
            >
                {isProcessing ? 'Processing...' : (mode === 'new' ? 'Start Operation' : 'Continue Operation')}
            </button>
            
            {!isReady && !isProcessing && mode && (
                <div className="mt-4 p-3 bg-gray-900 border border-yellow-700 rounded-md text-sm">
                    <p className="font-bold text-yellow-400 mb-2">Missing Requirements:</p>
                    <ul className="list-disc list-inside space-y-1 text-yellow-300">
                        {requirements.filter(r => !r.met).map((r, i) => <li key={i}>{r.label}</li>)}
                    </ul>
                </div>
            )}
        </div>
      )}
    </div>
  );
};

export default CampaignSetup;