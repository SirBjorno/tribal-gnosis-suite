import React, { useRef } from 'react';
import { DataManagerIcon, ImportIcon, ExportIcon, CloudIcon, CloudOffIcon, ProcessingIcon } from '';

interface DataManagerProps {
  onImport: (file: File) => void;
  onExport: () => void;
  onSync?: () => void;
  isSyncing?: boolean;
  isOnline: boolean;
  transcriptCount: number;
}

const DataManager: React.FC<DataManagerProps> = ({ onImport, onExport, onSync, isSyncing = false, isOnline, transcriptCount }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImport(file);
    }
    // Reset file input to allow re-uploading the same file
    event.target.value = '';
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-200/80">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
        <div className="flex items-center gap-4">
          <DataManagerIcon />
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Data Management</h2>
            <p className="text-slate-600">Manage your knowledge base.</p>
          </div>
        </div>
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${isOnline ? 'bg-green-100 text-green-800' : 'bg-slate-200 text-slate-600'}`}>
          {isOnline ? <CloudIcon /> : <CloudOffIcon />}
          <span>{isOnline ? 'Online' : 'Offline'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 border-t border-slate-200/80 pt-6">
        {/* Import Button */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".json"
          onChange={handleFileChange}
        />
        <button
          onClick={handleImportClick}
          className="w-full inline-flex items-center justify-center px-4 py-2 border border-slate-300 text-sm font-semibold rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 transition-colors"
        >
          <ImportIcon />
          <span className="ml-2">Import from File</span>
        </button>

        {/* Export Button */}
        <button
          onClick={onExport}
          disabled={transcriptCount === 0}
          className="w-full inline-flex items-center justify-center px-4 py-2 border border-slate-300 text-sm font-semibold rounded-md shadow-sm text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors"
        >
          <ExportIcon />
          <span className="ml-2">Export to File</span>
        </button>
        
        {/* Cloud Sync Button */}
        {onSync && (
            <button
            onClick={onSync}
            disabled={!isOnline || isSyncing}
            title={!isOnline ? "Cloud sync requires an internet connection" : "Refresh data from the cloud"}
            className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-semibold rounded-md text-white bg-sky-600 hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:bg-slate-400 disabled:cursor-not-allowed transition-colors"
            >
            {isSyncing ? <ProcessingIcon /> : <CloudIcon />}
            <span className="ml-2">{isSyncing ? 'Syncing...' : 'Sync with Cloud'}</span>
            </button>
        )}
      </div>
    </div>
  );
};

export default DataManager;
