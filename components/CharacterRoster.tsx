import React from 'react';
import { Character } from '../types';

interface CharacterRosterProps {
    characters: Character[];
}

const CharacterRoster: React.FC<CharacterRosterProps> = ({ characters }) => {
    return (
        <div>
            <h2 className="text-lg font-bold text-green-400 font-special-elite mb-4 border-b border-gray-700 pb-2">AGENTS</h2>
            <div className="space-y-4">
                {characters.map((char, index) => (
                    <div key={index} className="flex flex-col items-center text-center">
                        <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-600 mb-2 shadow-lg">
                            <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover" />
                        </div>
                        <p className="font-bold text-sm text-gray-200">{char.name}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CharacterRoster;