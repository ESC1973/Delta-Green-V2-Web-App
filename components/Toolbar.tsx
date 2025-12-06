import React from 'react';
import { SummaryIcon, BackgroundIcon } from './Icons';

interface ToolbarProps {
  onChangeBackground: () => void;
  onSummaryRequest: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ onChangeBackground, onSummaryRequest }) => {
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