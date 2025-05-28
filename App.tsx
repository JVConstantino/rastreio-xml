
import React, { useState, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { InputForm } from './components/InputForm';
import { TrackingDisplay } from './components/TrackingDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorMessage } from './components/ErrorMessage';
import { fetchTrackingData } from './services/trackingService';
import { summarizeTrackingWithGemini } from './services/geminiService';
import type { TrackingInfo } from './types';

const App: React.FC = () => {
  const [trackingIdInput, setTrackingIdInput] = useState<string>('');
  const [trackingData, setTrackingData] = useState<TrackingInfo | null>(null);
  const [geminiSummary, setGeminiSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (idToTrack: string) => {
    if (!idToTrack.trim()) {
      setError("Por favor, insira uma Chave de Acesso da DANFE.");
      setTrackingData(null);
      setGeminiSummary(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setTrackingData(null);
    setGeminiSummary(null);

    try {
      const data = await fetchTrackingData(idToTrack);
      setTrackingData(data);

      if (data) {
        try {
          // Ensure API key is set before calling Gemini
          if (process.env.API_KEY) {
            const summary = await summarizeTrackingWithGemini(data);
            setGeminiSummary(summary);
          } else {
            console.warn("Gemini API key not set. Skipping AI summary.");
            setGeminiSummary("AI summary unavailable: API key not configured.");
          }
        } catch (geminiError) {
          console.error("Gemini API error:", geminiError);
          setError("Falha ao gerar o resumo da IA. Exibindo dados brutos.");
          // Still show raw data even if Gemini fails
        }
      }
    } catch (fetchError: any) {
      console.error("Tracking API error:", fetchError);
      if (fetchError.message === "Failed to fetch") {
        setError("Falha ao buscar dados. Isso pode ser um problema de rede, CORS (a API de destino pode não permitir solicitações diretas do navegador) ou a API pode estar temporariamente indisponível. Verifique sua conexão e tente novamente. Se o problema persistir, pode ser necessário um proxy para acessar a API SSW Rastreios.");
      } else {
        setError(fetchError.message || "Falha ao buscar informações de rastreamento.");
      }
      setTrackingData(null);
      setGeminiSummary(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900 text-slate-100 flex flex-col items-center selection:bg-sky-500 selection:text-white">
      <Navbar />
      <main className="container mx-auto p-4 sm:p-6 md:p-8 flex-grow w-full max-w-4xl">
        <h1 className="text-4xl sm:text-5xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-cyan-300">
          Rastreie sua Encomenda
        </h1>
        
        <InputForm
          trackingId={trackingIdInput}
          onTrackingIdChange={setTrackingIdInput}
          onSubmit={handleSubmit}
          isLoading={isLoading}
        />

        {isLoading && <LoadingSpinner />}
        {error && !isLoading && <ErrorMessage message={error} />}
        
        {trackingData && !isLoading && (
          <TrackingDisplay trackingInfo={trackingData} geminiSummary={geminiSummary} />
        )}

        {!isLoading && !error && !trackingData && (
           <div className="mt-12 text-center text-slate-400">
            <p className="text-lg">Digite uma Chave de Acesso da DANFE para ver os detalhes do rastreamento.</p>
            <p className="text-sm mt-2">Este aplicativo usa a API SSW Rastreios. A chave da API para Gemini deve estar configurada em seu ambiente.</p>
          </div>
        )}
      </main>
      <footer className="w-full text-center p-4 text-sm text-slate-500">
        Powered by React, Tailwind CSS, SSW Rastreios, and Gemini API.
      </footer>
    </div>
  );
};

export default App;
