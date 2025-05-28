
import React from 'react';

interface InputFormProps {
  trackingId: string;
  onTrackingIdChange: (id: string) => void;
  onSubmit: (id: string) => void;
  isLoading: boolean;
}

const SearchIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
  </svg>
);


export const InputForm: React.FC<InputFormProps> = ({ trackingId, onTrackingIdChange, onSubmit, isLoading }) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(trackingId);
  };

  return (
    <form onSubmit={handleSubmit} className="mb-8 p-6 bg-slate-800 rounded-xl shadow-2xl">
      <label htmlFor="trackingId" className="block text-lg font-medium text-sky-300 mb-2">
        Chave de Acesso da DANFE
      </label>
      <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
        <input
          type="text"
          id="trackingId"
          value={trackingId}
          onChange={(e) => onTrackingIdChange(e.target.value)}
          placeholder="Digite a chave de acesso da DANFE"
          className="flex-grow p-3 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all"
          disabled={isLoading}
          aria-label="Chave de Acesso da DANFE"
        />
        <button
          type="submit"
          className="flex items-center justify-center p-3 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-lg shadow-md focus:outline-none focus:ring-2 focus:ring-sky-400 focus:ring-opacity-75 transition-all duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading}
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
      </div>
    </form>
  );
};
