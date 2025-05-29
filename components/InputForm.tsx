import React, { useState, useRef } from 'react';

interface InputFormProps {
  trackingId: string;
  onTrackingIdChange: (id: string) => void;
  onSubmit: (submission: string | File) => void;
  isLoading: boolean;
  fileInputKey?: string; // Used to reset the file input
  // Props for the PDF download button
  onShareClick: () => void; // This will now trigger PDF download
  isSharingImageActive: boolean; // Will be isGeneratingPdfActive
  shareImageStatusMessage: string | null; // Will be generatePdfStatusMessage
  canShare: boolean;
}

const SearchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
  </svg>
);

const UploadIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.338 0 4.5 4.5 0 01-1.41 8.775H6.75z" />
  </svg>
);

const PdfFileIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
  </svg>
);


export const InputForm: React.FC<InputFormProps> = ({ 
  trackingId, 
  onTrackingIdChange, 
  onSubmit, 
  isLoading, 
  fileInputKey,
  onShareClick, // Renamed for clarity: onPdfDownloadClick
  isSharingImageActive, // Renamed for clarity: isGeneratingPdfActive
  shareImageStatusMessage, // Renamed for clarity: generatePdfStatusMessage
  canShare
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTrackingId = e.target.value;
    onTrackingIdChange(newTrackingId);
    if (newTrackingId && selectedFile) {
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    if (file) {
      onTrackingIdChange('');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFile) {
      onSubmit(selectedFile);
    } else if (trackingId.trim()) {
      onSubmit(trackingId.trim());
    } else {
       onSubmit(''); 
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-8 p-6 bg-slate-800 rounded-xl shadow-2xl space-y-6">
      <div>
        <label htmlFor="trackingId" className="block text-lg font-medium text-sky-300 mb-2">
          Chave de Acesso da DANFE
        </label>
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
          <input
            type="text"
            id="trackingId"
            value={trackingId}
            onChange={handleIdChange}
            placeholder="Digite a chave de acesso"
            className="flex-grow p-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all"
            disabled={isLoading || isSharingImageActive}
            aria-label="Chave de Acesso da DANFE"
          />
        </div>
      </div>

      <div className="flex items-center my-4">
        <hr className="flex-grow border-t border-slate-600" />
        <span className="px-3 text-sm text-slate-400">OU</span>
        <hr className="flex-grow border-t border-slate-600" />
      </div>
      
      <div>
        <label htmlFor="xmlFile" className="block text-lg font-medium text-sky-300 mb-2">
          Upload Arquivo XML da NF-e
        </label>
        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-600 border-dashed rounded-md hover:border-sky-500 transition-colors">
          <div className="space-y-1 text-center">
            <UploadIcon className="mx-auto h-12 w-12 text-slate-400"/>
            <div className="flex text-sm text-slate-500">
              <label
                htmlFor="xmlFile"
                className="relative cursor-pointer bg-slate-700 rounded-md font-medium text-sky-400 hover:text-sky-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-slate-800 focus-within:ring-sky-500 px-2 py-1"
              >
                <span>Selecione o arquivo</span>
                <input 
                  id="xmlFile" 
                  name="xmlFile" 
                  type="file" 
                  className="sr-only" 
                  accept=".xml"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  key={fileInputKey}
                  disabled={isLoading || isSharingImageActive}
                />
              </label>
              <p className="pl-1">ou arraste e solte</p>
            </div>
            <p className="text-xs text-slate-500">
              {selectedFile ? selectedFile.name : 'Nenhum arquivo selecionado. Somente XML.'}
            </p>
          </div>
        </div>
      </div>
      
      <div className="space-y-4"> {/* Container for buttons */}
        <button
          type="submit"
          className="w-full flex items-center justify-center p-3 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-opacity-75 transition-all duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading || isSharingImageActive || (!selectedFile && !trackingId.trim())}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processando...
            </>
          ) : (
            <>
              <SearchIcon className="h-5 w-5 mr-2" />
              Rastrear
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onShareClick} // This prop name is kept general in App.tsx, so it's fine
          className="w-full flex items-center justify-center p-3 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-opacity-75 transition-all duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading || isSharingImageActive || !canShare}
          aria-label="Baixar PDF do rastreio"
        >
          {isSharingImageActive ? ( // Renamed prop used here
             <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Gerando PDF...
            </>
          ) : (
            <>
              <PdfFileIcon className="h-5 w-5 mr-2" />
              Baixar PDF do Rastreio
            </>
          )}
        </button>
        {shareImageStatusMessage && ( // Renamed prop used here
          <div className={`mt-2 p-2 text-sm rounded-md text-center ${shareImageStatusMessage.includes("Falha") || shareImageStatusMessage.includes("Erro") || shareImageStatusMessage.includes("cancelado") ? 'bg-red-500/30 text-red-300' : 'bg-green-500/30 text-green-300'}`}>
            {shareImageStatusMessage}
          </div>
        )}
      </div>
    </form>
  );
};