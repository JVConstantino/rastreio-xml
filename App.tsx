import React, { useState, useCallback, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { InputForm } from './components/InputForm';
import { TrackingDisplay, TrackingDisplayHandle } from './components/TrackingDisplay'; // Updated import
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorMessage } from './components/ErrorMessage';
import { fetchTrackingData } from './services/trackingService';
import { summarizeTrackingWithGemini } from './services/geminiService';
import { parseXmlAndExtractAccessKey, ParsedXmlData } from './utils/xmlParser'; // Import ParsedXmlData
import type { TrackingInfo } from './types';

const App: React.FC = () => {
  const [trackingIdInput, setTrackingIdInput] = useState<string>('');
  const [trackingData, setTrackingData] = useState<TrackingInfo | null>(null);
  const [geminiSummary, setGeminiSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [fileInputResetKey, setFileInputResetKey] = useState<string>(Date.now().toString());

  // State for PDF generation
  const [isGeneratingPdfActive, setIsGeneratingPdfActive] = useState<boolean>(false);
  const [generatePdfStatusMessage, setGeneratePdfStatusMessage] = useState<string | null>(null);
  const trackingDisplayRef = useRef<TrackingDisplayHandle>(null);


  const resetState = (keepInput: boolean = false) => {
    setError(null);
    setTrackingData(null);
    setGeminiSummary(null);
    if (!keepInput) {
      setTrackingIdInput('');
    }
    setGeneratePdfStatusMessage(null); // Also clear PDF generation status
  };

  const processTrackingRequest = async (accessKey: string, xmlData?: ParsedXmlData) => {
    setIsLoading(true);
    resetState(true); 
    setTrackingIdInput(accessKey);

    try {
      // Fetch core tracking data using SSW API
      const sswTrackingData = await fetchTrackingData(accessKey, xmlData?.carrierName);
      
      // Combine SSW data with additional details from XML
      const combinedData: TrackingInfo = {
        ...sswTrackingData, // Base data from SSW
        // XML specific data (will be undefined if xmlData is not provided)
        xmlVolumeInfo: xmlData?.volumeInfo,
        xmlInvoiceInfo: xmlData?.invoiceInfo,
        xmlInstallments: xmlData?.installments,
      };
      
      setTrackingData(combinedData);

      if (combinedData && combinedData.events.length > 0) {
        if (process.env.API_KEY) {
          try {
            const summary = await summarizeTrackingWithGemini(combinedData);
            setGeminiSummary(summary);
          } catch (geminiError) {
            console.error("Gemini API error:", geminiError);
            setGeminiSummary("Falha ao gerar o resumo da IA. Verifique o console."); 
          }
        } else {
          console.warn("Gemini API key not set. Skipping AI summary.");
          setGeminiSummary("Resumo da IA indisponível: Chave da API não configurada.");
        }
      } else if (combinedData && combinedData.events.length === 0) {
        setGeminiSummary(null); // No AI summary if no tracking events
      }
    } catch (fetchError: any) {
      console.error("Tracking API error:", fetchError);
      if (fetchError.message?.includes("Failed to fetch")) {
        setError("Falha ao buscar dados. Pode ser um problema de rede, CORS (API de destino pode não permitir solicitações diretas do navegador) ou a API pode estar indisponível. Verifique sua conexão e tente novamente.");
      } else {
        setError(fetchError.message || "Falha ao buscar informações de rastreamento.");
      }
      setTrackingData(null);
      setGeminiSummary(null);
    } finally {
      setIsLoading(false);
      setFileInputResetKey(Date.now().toString());
    }
  };
  
  const processXmlFile = async (file: File) => {
    setIsLoading(true);
    resetState(); 
    try {
      // parseXmlAndExtractAccessKey now returns ParsedXmlData which includes volume, invoice, etc.
      const xmlData = await parseXmlAndExtractAccessKey(file);
      // Pass the full xmlData to processTrackingRequest
      await processTrackingRequest(xmlData.accessKey, xmlData); 
    } catch (xmlError: any) {
      console.error("XML Processing Error:", xmlError);
      setError(xmlError.message || "Erro desconhecido ao processar o arquivo XML.");
      setTrackingData(null);
      setGeminiSummary(null);
      setIsLoading(false);
      setFileInputResetKey(Date.now().toString());
    }
  };

  const handleSubmit = useCallback(async (submission: string | File) => {
    setGeneratePdfStatusMessage(null); 
    if (typeof submission === 'string') {
      if (!submission.trim()) {
        setError("Por favor, insira uma Chave de Acesso da DANFE ou selecione um arquivo XML.");
        resetState(); 
        setIsLoading(false);
        return;
      }
      // For direct key input, xmlData will be undefined
      await processTrackingRequest(submission.trim());
    } else {
      await processXmlFile(submission);
    }
  }, []);

  const handleTriggerPdfDownload = async () => { // Renamed from handleTriggerShare
    if (!trackingData || !trackingDisplayRef.current) {
      setGeneratePdfStatusMessage("Nenhum dado de rastreamento para gerar PDF ou referência de exibição ausente.");
      return;
    }
    setIsGeneratingPdfActive(true);
    setGeneratePdfStatusMessage(null);
    try {
      const message = await trackingDisplayRef.current.triggerPdfDownload(); // Call renamed method
      setGeneratePdfStatusMessage(message);
    } catch (error: any) {
      setGeneratePdfStatusMessage(error.message || "Falha ao gerar PDF.");
    } finally {
      setIsGeneratingPdfActive(false);
      setTimeout(() => setGeneratePdfStatusMessage(null), 7000);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900 text-slate-100 flex flex-col items-center selection:bg-sky-500 selection:text-white">
      <Navbar />
      <main className="container mx-auto p-4 sm:p-6 md:p-8 flex-grow w-full max-w-4xl">
        <h1 className="text-4xl sm:text-5xl font-bold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-sky-400 to-cyan-300">
          Rastreie sua Encomenda
        </h1>
        
        <InputForm
          trackingId={trackingIdInput}
          onTrackingIdChange={(id) => {
            setTrackingIdInput(id);
          }}
          onSubmit={handleSubmit}
          isLoading={isLoading}
          fileInputKey={fileInputResetKey}
          onShareClick={handleTriggerPdfDownload} // Pass the renamed handler
          isSharingImageActive={isGeneratingPdfActive} // Pass renamed state
          shareImageStatusMessage={generatePdfStatusMessage} // Pass renamed state
          canShare={!!trackingData && trackingData.events.length > 0} 
        />

        {isLoading && <LoadingSpinner />}
        {error && !isLoading && <ErrorMessage message={error} />}
        
        {trackingData && !isLoading && (
          <TrackingDisplay 
            ref={trackingDisplayRef} 
            trackingInfo={trackingData} 
            geminiSummary={geminiSummary} 
          />
        )}

        {!isLoading && !error && !trackingData && (
           <div className="mt-12 text-center text-slate-400">
            <p className="text-lg">Digite uma Chave de Acesso da DANFE ou faça upload de um arquivo XML NF-e.</p>
          </div>
        )}
      </main>
      
    </div>
  );
};

export default App;