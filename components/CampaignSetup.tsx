import React, { useState, useMemo, useEffect } from 'react';
import { UploadIcon } from './Icons';
import { Character } from '../types';

export interface GameData {
  characters: Character[];
  journal: string | null;
  rulebooks: string;
}

interface FileUploadProps {
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
    // Clean up potential non-standard characters from PDF-to-text conversion, like form feed (\f).
    const cleanedContent = sheetContent.replace(/\f/g, '\n');
    const lines = cleanedContent.split(/\r?\n/);
    
    // Look for the line containing "LAST NAME, FIRST NAME" and get the next non-empty line.
    const nameLabelIndex = lines.findIndex(line => 
        line.toUpperCase().includes('LAST NAME, FIRST NAME')
    );

    if (nameLabelIndex !== -1 && nameLabelIndex + 1 < lines.length) {
        for (let i = nameLabelIndex + 1; i < lines.length; i++) {
            const potentialName = lines[i].trim();
            if (potentialName) {
                // Handle "Last, First M." format by extracting the first name.
                const parts = potentialName.split(',');
                if (parts.length > 1) {
                    const firstName = parts[1].trim().split(' ')[0];
                    return `${firstName} ${parts[0].trim()}`;
                }
                return potentialName; // Return full line if not in "Last, First" format
            }
        }
    }

    // Fallback for "NAME:" format
    const nameLine = lines.find(line => line.toUpperCase().startsWith('NAME:'));
    if (nameLine) {
        return nameLine.substring(5).trim();
    }

    return ""; // Return empty string if not found, allowing manual input
};


const CampaignSetup: React.FC<FileUploadProps> = ({ onStartGame }) => {
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
            const newData = Array(count).fill({sheet: null, image: null, name: ''});
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
                newData[index].name = ""; // Clear name on error
            }
        }
        setCharData(newData);
    };
    
    const handleNameChange = (index: number, name: string) => {
        const newData = [...charData];
        newData[index].name = name;
        setCharData(newData);
    };

    const isReady = useMemo(() => {
        if (!mode) return false;
        const hasRulebooks = rulebookFiles.length > 0;
        const allCharsReady = charData.every(data => data.sheet !== null && data.image !== null && data.name.trim() !== '');
        const hasJournal = mode === 'continue' ? journalFile !== null : true;
        return hasRulebooks && allCharsReady && hasJournal;
    }, [rulebookFiles, charData, journalFile, mode]);

    const handleStart = async () => {
        if (!isReady) return;
        setIsProcessing(true);
        try {
            const rulebooks = (await Promise.all(rulebookFiles.map(readFileAsText))).join('\n\n--- END OF FILE ---\n\n');
            
            const characters: Character[] = await Promise.all(charData.map(async (data) => {
                const sheet = await readFileAsText(data.sheet!);
                const imageUrl = await readFileAsDataURL(data.image!);
                return { name: data.name, sheet, imageUrl };
            }));

            const journal = journalFile ? await readFileAsText(journalFile) : null;
            
            onStartGame({ characters, journal, rulebooks });
        } catch (error) {
            console.error("Error processing files:", error);
            alert("There was an error reading the files. Please try again.");
            setIsProcessing(false);
        }
    };

    const FileInput: React.FC<{ label: string; fileName: string | null; onChange: (files: FileList | null) => void; accepted: string; id: string; multiple?: boolean; }> = 
    ({ label, fileName, onChange, accepted, id, multiple }) => (
        <div className="py-2">
            <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
            <label htmlFor={id} className="w-full text-sm p-2 bg-gray-700 border border-gray-600 rounded-md flex items-center justify-between cursor-pointer hover:bg-gray-600">
                <span className="text-gray-300 truncate pr-2">
                    {fileName || 'No file selected'}
                </span>
                <UploadIcon className="w-5 h-5 text-green-400 flex-shrink-0"/>
            </label>
            <input id={id} type="file" className="sr-only" accept={accepted} onChange={e => onChange(e.target.files)} multiple={multiple} />
        </div>
    );
    
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
                      <FileInput id={`char-sheet-${i}`} label={`Sheet (.txt)`} fileName={charData[i]?.sheet?.name || null} onChange={fl => handleCharFileChange(i, 'sheet', fl?.[0] || null)} accepted=".txt" />
                      <FileInput id={`char-image-${i}`} label={`Portrait (image)`} fileName={charData[i]?.image?.name || null} onChange={fl => handleCharFileChange(i, 'image', fl?.[0] || null)} accepted="image/*" />
                      <div>
                        <label htmlFor={`char-name-${i}`} className="block text-xs font-medium text-gray-400 mb-1">Agent Name (auto-filled or manual)</label>
                        <input id={`char-name-${i}`} type="text" value={charData[i]?.name} onChange={e => handleNameChange(i, e.target.value)} placeholder="Enter name or upload sheet" className="mt-1 w-full p-2 bg-gray-700 border border-gray-600 rounded-md text-sm"/>
                      </div>
                  </div>
                ))}
            </div>

            {mode === 'continue' && (
                <FileInput id="journal-file" label="Campaign Journal (.txt)" fileName={journalFile?.name || null} onChange={fl => setJournalFile(fl?.[0] || null)} accepted=".txt" />
            )}

            <FileInput id="rulebook-files" label="Rulebook(s) (.txt)" fileName={rulebookFiles.length > 0 ? `${rulebookFiles.length} file(s)` : null} onChange={fl => setRulebookFiles(fl ? Array.from(fl) : [])} multiple accepted=".txt" />
          
            <button
                onClick={handleStart}
                disabled={!isReady || isProcessing}
                className="w-full mt-4 p-4 bg-green-600 hover:bg-green-700 rounded-md text-white font-bold transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed text-lg"
            >
                {isProcessing ? 'Processing...' : (mode === 'new' ? 'Start Operation' : 'Continue Operation')}
            </button>
        </div>
      )}
    </div>
  );
};

export default CampaignSetup;