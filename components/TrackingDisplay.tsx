import React, { useEffect, useState, useRef, useImperativeHandle, forwardRef } from 'react';
import type { TrackingInfo, TrackingEvent, XmlVolumeInfo, XmlInvoiceInfo, XmlInstallmentInfo } from '../types';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface TrackingDisplayProps {
  trackingInfo: TrackingInfo;
  geminiSummary: string | null;
}

export interface TrackingDisplayHandle {
  triggerPdfDownload: () => Promise<string>; 
}

// Helper function to format currency
const formatCurrency = (value?: number): string => {
  if (value === undefined || value === null) return 'N/A';
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Helper function to format dates (YYYY-MM-DD to DD/MM/YYYY)
const formatDate = (dateString?: string): string => {
  if (!dateString) return 'N/A';
  const parts = dateString.split('-');
  if (parts.length !== 3) return dateString; // Return original if not YYYY-MM-DD
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

const InfoPill: React.FC<{label: string; value: string | undefined; icon?: React.ReactNode; className?: string}> = ({ label, value, icon, className ="" }) => (
  <div className={`bg-slate-700 p-3 rounded-lg shadow ${className}`}>
    <div className="text-xs text-sky-300 mb-1 flex items-center">
      {icon && <span className="mr-1.5">{icon}</span>}
      {label}
    </div>
    <div className="text-sm font-semibold text-slate-100 break-words">{value || 'N/A'}</div>
  </div>
);

const EventCard: React.FC<{event: TrackingEvent; isLast: boolean}> = ({ event, isLast }) => {
  let displayTimestamp = "Data inválida";
  try {
    if (new Date(event.timestamp).getTime() === new Date(0).getTime() && event.timestamp !== new Date(0).toISOString()) {
        displayTimestamp = "Data do evento não disponível";
    } else if (new Date(event.timestamp).getTime() === new Date(0).getTime()) { 
        displayTimestamp = "Data do evento não fornecida";
    }
    else {
        displayTimestamp = new Date(event.timestamp).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit'
        });
    }
  } catch (e) {
    console.warn("Falha ao formatar o timestamp do evento:", event.timestamp, e);
  }

  return (
    <li className="relative pb-8 pl-6 border-l-2 border-slate-600">
      {!isLast && <div className="absolute w-px h-full bg-slate-600 left-[-1px] top-2"></div>}
      <div className="absolute -left-[9px] top-0.5 w-4 h-4 bg-sky-500 rounded-full border-2 border-slate-800"></div>
      <div className="ml-4">
        <h4 className="font-semibold text-sky-400">{event.status}</h4>
        <p className="text-xs text-slate-400">{displayTimestamp}</p>
        <p className="text-sm text-slate-300">{event.location}</p>
        {event.details && <p className="text-xs text-slate-400 mt-1">{event.details}</p>}
      </div>
    </li>
  );
};

// Section for XML Volume Details
const XmlVolumeDetails: React.FC<{ volumeInfo: XmlVolumeInfo }> = ({ volumeInfo }) => (
  <div className="mt-6 pt-4 border-t border-slate-700">
    <h3 className="text-xl font-semibold text-sky-300 mb-3">Volumes Transportados (do XML)</h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <InfoPill label="Quantidade" value={volumeInfo.quantity?.toString()} />
      <InfoPill label="Espécie" value={volumeInfo.species} />
      <InfoPill label="Peso Líquido" value={volumeInfo.netWeight ? `${volumeInfo.netWeight.toFixed(3)} kg` : undefined} />
      <InfoPill label="Peso Bruto" value={volumeInfo.grossWeight ? `${volumeInfo.grossWeight.toFixed(3)} kg` : undefined} />
    </div>
  </div>
);

// Section for XML Invoice Details
const XmlInvoiceDetails: React.FC<{ invoiceInfo: XmlInvoiceInfo }> = ({ invoiceInfo }) => (
  <div className="mt-6 pt-4 border-t border-slate-700">
    <h3 className="text-xl font-semibold text-sky-300 mb-3">Fatura (do XML)</h3>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <InfoPill label="Número da Fatura" value={invoiceInfo.number} />
      <InfoPill label="Valor Original" value={formatCurrency(invoiceInfo.originalValue)} />
      {invoiceInfo.discountValue !== undefined && (
        <InfoPill label="Valor do Desconto" value={formatCurrency(invoiceInfo.discountValue)} />
      )}
      <InfoPill label="Valor Líquido" value={formatCurrency(invoiceInfo.netValue)} />
    </div>
  </div>
);

// Section for XML Installments
const XmlInstallmentsDetails: React.FC<{ installments: XmlInstallmentInfo[] }> = ({ installments }) => (
  <div className="mt-6 pt-4 border-t border-slate-700">
    <h3 className="text-xl font-semibold text-sky-300 mb-3">Duplicatas (do XML)</h3>
    {installments.length > 0 ? (
      <div className="space-y-4">
        {installments.map((dup, index) => (
          <div key={index} className="p-3 bg-slate-700/50 rounded-lg shadow">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-2">
              <InfoPill label="Duplicata Nº" value={dup.number} className="bg-transparent shadow-none p-0"/>
              <InfoPill label="Vencimento" value={formatDate(dup.dueDate)} className="bg-transparent shadow-none p-0"/>
              <InfoPill label="Valor" value={formatCurrency(dup.value)} className="bg-transparent shadow-none p-0"/>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <p className="text-slate-400">Nenhuma duplicata encontrada no XML.</p>
    )}
  </div>
);


const TrackingDisplay = forwardRef<TrackingDisplayHandle, TrackingDisplayProps>(({ trackingInfo, geminiSummary }, ref) => {
  const [isVisible, setIsVisible] = useState(false);
  const displayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const animationFrameId = requestAnimationFrame(() => {
      setIsVisible(true);
    });
    return () => cancelAnimationFrame(animationFrameId);
  }, []); 

  useImperativeHandle(ref, () => ({
    triggerPdfDownload: async (): Promise<string> => { 
      if (!displayRef.current) {
        throw new Error("Elemento de exibição não encontrado para captura.");
      }
      
      try {
        const canvas = await html2canvas(displayRef.current, {
          scale: 2, // Higher scale for better quality
          backgroundColor: '#0f172a', // Match app background (slate-900)
          useCORS: true, 
          logging: false, 
        });
        
        const imgData = canvas.toDataURL('image/png');
        
        // Calculate PDF page dimensions to fit the entire canvas content
        const imgWidthPx = canvas.width;
        const imgHeightPx = canvas.height;
        
        // Standard A4 width in mm for reference, or choose your desired width
        const pdfPageWidthMm = 210; 
        // Calculate height in mm to maintain aspect ratio
        const pdfPageHeightMm = (imgHeightPx * pdfPageWidthMm) / imgWidthPx;

        const pdf = new jsPDF({
          orientation: 'p', // portrait
          unit: 'mm', 
          format: [pdfPageWidthMm, pdfPageHeightMm] // Custom page size [width, height]
        });
        
        // Add image to cover the entire custom page
        pdf.addImage(imgData, 'PNG', 0, 0, pdfPageWidthMm, pdfPageHeightMm);

        let nfIdentifier = trackingInfo.id; // Fallback to DANFE key
        if (trackingInfo.productName) {
          const nfMatch = trackingInfo.productName.match(/Nota Fiscal:\s*(\S+)/i);
          if (nfMatch && nfMatch[1]) {
            nfIdentifier = nfMatch[1];
          }
        }
        const filename = `rastreio-nf${nfIdentifier}.pdf`;
        
        pdf.save(filename);
        return `PDF '${filename}' baixado com sucesso.`;

      } catch (error) {
        console.error("Erro ao gerar ou baixar PDF:", error);
        throw new Error("Falha ao gerar ou baixar PDF. Tente novamente.");
      }
    }
  }));

  const baseClasses = "mt-8 p-6 bg-slate-800 rounded-xl shadow-2xl transition-all duration-500 ease-out";
  const animationClasses = isVisible 
    ? 'opacity-100 translate-y-0' 
    : 'opacity-0 translate-y-[10px]';

  return (
    <div ref={displayRef} className={`${baseClasses} ${animationClasses}`}>
      <div className="flex justify-between items-start mb-6">
        <h2 className="text-2xl font-bold text-sky-400">Detalhes do Rastreio para {trackingInfo.id}</h2>
      </div>

      {geminiSummary && (
        <div className="mb-6 p-4 bg-sky-800/50 border border-sky-700 rounded-lg shadow-lg">
          <h3 className="text-xl font-semibold text-sky-300 mb-2">Resumo da IA ✨</h3>
          <p className="text-slate-200 whitespace-pre-wrap">{geminiSummary}</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <InfoPill label="Status Atual (SSW)" value={trackingInfo.currentStatus} />
        <InfoPill label="Transportadora" value={trackingInfo.carrier} />
        <InfoPill label="Prev. Entrega (SSW)" value={trackingInfo.estimatedDelivery} />
        <InfoPill label="Origem" value={trackingInfo.origin} />
        <InfoPill label="Destino" value={trackingInfo.destination} />
        {trackingInfo.productName && <InfoPill label="Produto/NF" value={trackingInfo.productName} />}
        {trackingInfo.weight && <InfoPill label="Peso (SSW)" value={trackingInfo.weight} />}
      </div>
      
      {/* Display XML Specific Data if available */}
      {trackingInfo.xmlVolumeInfo && <XmlVolumeDetails volumeInfo={trackingInfo.xmlVolumeInfo} />}
      {trackingInfo.xmlInvoiceInfo && <XmlInvoiceDetails invoiceInfo={trackingInfo.xmlInvoiceInfo} />}
      {trackingInfo.xmlInstallments && trackingInfo.xmlInstallments.length > 0 && (
        <XmlInstallmentsDetails installments={trackingInfo.xmlInstallments} />
      )}


      <h3 className="text-xl font-semibold text-sky-300 mb-4 mt-8">Histórico de Rastreio (SSW)</h3>
      {trackingInfo.events.length > 0 ? (
        <ol className="relative">
          {trackingInfo.events.map((event, index) => (
            <EventCard key={index} event={event} isLast={index === trackingInfo.events.length - 1} />
          ))}
        </ol>
      ) : (
        <p className="text-slate-400">Nenhum evento de rastreamento SSW disponível.</p>
      )}
    </div>
  );
});

export { TrackingDisplay };