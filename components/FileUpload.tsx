
import React, { useState } from 'react';
import { UploadIcon } from './Icons';

interface FileUploadProps {
  onFileUpload: (content: string) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    setIsProcessing(true);
    let combinedContent = '';
    const filePromises = Array.from(files).map(file => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
      });
    });

    try {
      const contents = await Promise.all(filePromises);
      combinedContent = contents.join('\n\n--- END OF FILE ---\n\n');
      onFileUpload(combinedContent);
    } catch (error) {
      console.error("Error reading files:", error);
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-lg p-8 bg-gray-800 bg-opacity-80 backdrop-blur-md border border-gray-700 rounded-lg text-center shadow-2xl">
      <h2 className="text-2xl font-bold text-green-400 font-special-elite mb-4">OPERATION BRIEFING</h2>
      <p className="text-gray-400 mb-6">
        Upload the Delta Green rulebook (.txt files) to provide operational context. You can select multiple files.
      </p>
      <label
        htmlFor="file-upload"
        className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-gray-900 bg-green-400 hover:bg-green-500 cursor-pointer transition-colors"
      >
        <UploadIcon className="w-5 h-5 mr-2" />
        <span>{isProcessing ? 'Processing Files...' : 'Select Rulebooks'}</span>
      </label>
      <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple accept=".txt" onChange={handleFileChange} disabled={isProcessing} />
      <p className="text-xs text-gray-500 mt-4">Your files are processed locally and are not stored on any server.</p>
    </div>
  );
};

export default FileUpload;
