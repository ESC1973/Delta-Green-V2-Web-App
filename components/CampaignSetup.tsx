import React, { useState, useMemo } from 'react';
import { UploadIcon } from './Icons';
import { Character } from '../types';
import { PLACEHOLDER_IMAGE } from '../constants';

export interface GameData {
  characters: Character[];
  journal: string | null;
  rulebooks: string;
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
    const cleanedContent = sheetContent.replace(/\f/g, ''); 
    const lines = cleanedContent.split('\n');
    
    const nameLabelIndex = lines.findIndex(line => 
        line.toUpperCase().includes('LAST NAME, FIRST NAME') || line.toUpperCase().startsWith('NAME:')
    );

    if (nameLabelIndex !== -1) {
        // Handle "NAME: Agent Name" format
        const nameOnSameLineMatch = lines[nameLabelIndex].match(/(?:LAST NAME, FIRST NAME, MIDDLE INITIAL|NAME:)\s*(.*)/i);
        if (nameOnSameLineMatch && nameOnSameLineMatch[1] && nameOnSameLineMatch[1].trim()) {
            return nameOnSameLineMatch[1].trim();
        }
        
        // Handle name on the next line
        if (nameLabelIndex + 1 < lines.length) {
            const nameLine = lines[nameLabelIndex + 1].trim();
            if (nameLine) {
                // Remove potential character sheet formatting like "1. "
                return nameLine.replace(/^\d+\.\s*/, '').trim();
            }
        }
    }
    return "";
};

// Standalone FileInput to prevent re-render issues
const FileInput = ({ id, label, file, onChange, multiple = false, accept = ".txt" }: { id: string, label: string, file: File | File[] | null, onChange: (files: File[]) => void, multiple?: boolean, accept?: string }) => {
    const displayValue = Array.isArray(file) ? (file.length > 0 ? `${file.length} file(s) selected` : 'No files selected') : (file?.name || 'No file selected');
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.files ? Array.from(e.target.files) : []);
    };
    return (
        <div className="py-2">
            <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
            <label htmlFor={id} className="w-full text-sm p-2 bg-gray-700 border border-gray-600 rounded-md flex items-center justify-between cursor-pointer hover:bg-gray-600">
                <span className="text-gray-300 truncate pr-2">{displayValue}</span>
                <UploadIcon className="w-5 h-5 text-green-400 flex-shrink-0"/>
            </label>
            <input id={id} type="file" className="sr-only" accept={accept} multiple={multiple} onChange={handleFileChange} />
        </div>
    );
};


const CampaignSetup: React.FC<CampaignSetupProps> = ({ onStartGame }) => {
    const [mode, setMode] = useState<'new' | 'continue' | null>(null);
    const [playerCount, setPlayerCount] = useState<number>(1);
    const [charData, setCharData] = useState<{sheet: File | null, image: File | null, name: string}[]>(Array(1).fill({sheet: null, image: null, name: ''}));
    const [journalFile, setJournalFile] = useState<File | null>(null);
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
            
            onStartGame({ characters, journal, rulebooks });
        } catch (error) {
            console.error("Error processing files:", error);
            alert("There was an error reading the files. Please try again.");
            setIsProcessing(false);
        }
    };

  return (
    <div className="w-full max-w-md p-6 bg-gray-800 bg-opacity-80 backdrop-blur-md border border-gray-700 rounded-lg shadow-2xl text-gray-300">
      <h2 className="text-2xl font-bold text-green-400 font-special-elite mb-4 text-center">CAMPAIGN SETUP</h2>
      
      {!mode ? (
        <div className="flex flex-col gap-4 mt-6">
          <button onClick={() => setMode('new')} className="w-full p-3 bg-green-700 hover:bg-green-600 rounded-md text-white font-bold transition-colors">New Campaign</button>
          <button onClick={() => setMode('continue')} className="w-full p-3 bg-gray-700 hover:bg-gray-600 rounded-md text-white font-bold transition-colors">Continue Campaign</button>
        </div>
      ) : (
        <div className="space-y-4">
            <button onClick={() => setMode(null)} className="text-sm text-green-400 hover:underline">{'< Back'}</button>
            <h3 className="text-xl font-bold text-center capitalize font-special-elite">{mode} Campaign</h3>

            <div>
                <label htmlFor="player-count" className="block text-sm font-medium text-gray-300">Player Characters (1-8)</label>
                <input id="player-count" type="number" min="1" max="8" value={playerCount} onChange={handlePlayerCountChange} className="mt-1 w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-sm"/>
            </div>

            <div className="space-y-3 border-t border-b border-gray-700 py-3">
                {Array.from({ length: playerCount }).map((_, i) => (
                  <div key={i} className="p-3 border border-gray-600 rounded-md">
                      <p className="font-bold text-center text-green-400">Agent {i+1}</p>
                      
                        <FileInput id={`char-sheet-${i}`} label="Sheet (.txt)" file={charData[i]?.sheet} onChange={files => handleCharFileChange(i, 'sheet', files[0] || null)} />
                        <FileInput id={`char-image-${i}`} label="Portrait (image - optional)" file={charData[i]?.image} onChange={files => handleCharFileChange(i, 'image', files[0] || null)} accept="image/*"/>

                      <div>
                        <label htmlFor={`char-name-${i}`} className="block text-xs font-medium text-gray-400 mb-1">Agent Name</label>
                        <input id={`char-name-${i}`} type="text" value={charData[i]?.name} onChange={e => handleNameChange(i, e.target.value)} placeholder="Type name or upload sheet" className="mt-1 w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-sm"/>
                      </div>
                  </div>
                ))}
            </div>

            {mode === 'continue' && <FileInput id="journal-file" label="Campaign Journal (.txt)" file={journalFile} onChange={files => setJournalFile(files[0] || null)} />}
            
            <FileInput id="rulebook-files" label="Rulebook(s) (.txt)" file={rulebookFiles} onChange={setRulebookFiles} multiple />
          
            <button
                onClick={handleStart}
                disabled={!isReady || isProcessing}
                className="w-full mt-4 p-3 bg-green-600 hover:bg-green-700 rounded-md text-white font-bold transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed text-lg"
            >
                {isProcessing ? 'Processing...' : (mode === 'new' ? 'Start Operation' : 'Continue Operation')}
            </button>
            
            {!isReady && !isProcessing && mode && (
                <div className="mt-2 p-2 bg-gray-900 border border-yellow-700 rounded-md text-xs">
                    <p className="font-bold text-yellow-400 mb-1">Missing Requirements:</p>
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
