
import React, { useRef } from 'react';
import { UploadIcon, SummaryIcon, BackgroundIcon } from './Icons';

interface ToolbarProps {
  onChangeBackground: () => void;
  onSummaryRequest: () => void;
  onSummaryUpload: (content: string) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ onChangeBackground, onSummaryRequest, onSummaryUpload }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        onSummaryUpload(content);
      };
      reader.readAsText(file);
    }
     // Reset file input to allow uploading the same file again
    if(event.target) {
        event.target.value = '';
    }
  };

  const TooltipButton: React.FC<{ onClick: () => void; tooltip: string; children: React.ReactNode }> = ({ onClick, tooltip, children }) => (
    <div className="relative group">
      <button
        onClick={onClick}
        className="p-2 rounded-full bg-gray-700 hover:bg-green-800 text-gray-300 hover:text-green-300 transition-colors"
      >
        {children}
      </button>
      <div className="absolute bottom-full mb-2 right-1/2 translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        {tooltip}
      </div>
    </div>
  );

  return (
    <div className="flex items-center space-x-2">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".txt"
        onChange={handleFileChange}
      />
      <TooltipButton onClick={handleFileClick} tooltip="Upload Summary">
        <UploadIcon className="h-5 w-5" />
      </TooltipButton>
      <TooltipButton onClick={onSummaryRequest} tooltip="Request Summary">
        <SummaryIcon className="h-5 w-5" />
      </TooltipButton>
      <TooltipButton onClick={onChangeBackground} tooltip="Change Background">
        <BackgroundIcon className="h-5 w-5" />
      </TooltipButton>
    </div>
  );
};

export default Toolbar;
