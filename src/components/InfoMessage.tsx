import React from 'react';
import { InfoIcon, CloseIcon } from '';

interface InfoMessageProps {
  message: string;
  onDismiss: () => void;
}

const InfoMessage: React.FC<InfoMessageProps> = ({ message, onDismiss }) => {
  return (
    <div className="bg-sky-100 border-l-4 border-sky-500 text-sky-800 p-4 rounded-md my-4 flex justify-between items-center animate-fade-in" role="alert">
      <div className="flex items-center">
        <div className="flex-shrink-0">
            <InfoIcon />
        </div>
        <p className="ml-3">{message}</p>
      </div>
      <button onClick={onDismiss} className="p-1 rounded-full hover:bg-sky-200 transition-colors" aria-label="Dismiss">
        <CloseIcon />
      </button>
    </div>
  );
};

export default InfoMessage;
