
import type { TrackingInfo, TrackingEvent } from '../types';

// Helper function to parse SSW date strings (dd/MM/yy or dd/MM/yyyy) to ISO string or null
// Specifically for "Previsao de entrega" which might be in "dd/MM/yy" format.
const parseSswDateForDelivery = (dateString: string | null | undefined): string | null => {
  if (!dateString || typeof dateString !== 'string' || dateString.trim() === '') {
    return null;
  }

  const parts = dateString.trim().split(' '); // Handles if time part is present, though not expected for delivery
  const dateParts = parts[0].split('/');
  if (dateParts.length !== 3) {
    console.warn("Formato de data inválido (parte da data) em parseSswDateForDelivery:", dateString);
    return null;
  }

  const day = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10) - 1; // Month is 0-indexed in JS Date
  
  let yearStr = dateParts[2];
  let year = parseInt(yearStr, 10);

  if (isNaN(day) || isNaN(month) || isNaN(year)) {
    console.warn("Componentes de data inválidos (dia, mês ou ano) em parseSswDateForDelivery:", dateString);
    return null;
  }
  
  // Handle 2-digit year, assume 21st century
  if (yearStr.length === 2) {
    year += 2000;
  }

  if (year < 2000 || year > 2100) { // Adjusted reasonable range for delivery dates
    console.warn("Ano fora do intervalo esperado em parseSswDateForDelivery:", dateString);
    return null;
  }
  
  // SSW estimated delivery usually doesn't have time, so default to UTC midnight
  try {
    return new Date(Date.UTC(year, month, day)).toISOString();
  } catch (e) {
    console.warn("Erro ao criar objeto Date em parseSswDateForDelivery:", dateString, e);
    return null;
  }
};


export const fetchTrackingData = async (accessKey: string, carrierNameFromXml?: string): Promise<TrackingInfo> => {
  const apiUrl = `https://ssw.inf.br/api/trackingdanfe`;
  const defaultCarrierName = "SSW Transportes";

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ chave_nfe: accessKey }),
    });

    if (!response.ok) {
      let errorMessage = `Falha ao buscar dados de rastreamento do SSW. Status: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData && errorData.message) {
          errorMessage = `Erro da API SSW: ${errorData.message} (Status: ${response.status})`;
        }
      } catch (e) { /* Ignore parsing error, use generic HTTP error */ }
      throw new Error(errorMessage);
    }

    const sswResponse = await response.json();

    if (!sswResponse.success) {
      throw new Error(sswResponse.message || "Chave de rastreamento não encontrada ou inválida no SSW.");
    }
    
    if (!sswResponse.documento) {
      console.warn(
        `API SSW retornou success:true mas sem 'documento' para a chave: ${accessKey}. Resposta:`,
        sswResponse
      );
      return {
        id: accessKey,
        carrier: carrierNameFromXml || defaultCarrierName,
        estimatedDelivery: "Não disponível",
        currentStatus: "Nenhuma informação de rastreamento disponível. (Sem 'documento')",
        events: [],
        origin: "Não informado",
        destination: "Não informado",
        productName: `DANFE: ${accessKey}`,
        weight: undefined,
      };
    }
    
    const doc = sswResponse.documento;
    const header = doc.header || {};
    const sswEventsData = doc.tracking;

    if (!sswEventsData || !Array.isArray(sswEventsData) || sswEventsData.length === 0) {
      console.warn(
        `Campo 'tracking' (eventos) ausente, não é um array ou está vazio na API SSW para a chave ${accessKey}. Resposta:`, 
        sswResponse
      );
      return { // Return header info if available, but no events
        id: accessKey,
        carrier: carrierNameFromXml || defaultCarrierName,
        estimatedDelivery: "Não disponível",
        currentStatus: "Nenhum evento de rastreamento encontrado.",
        events: [],
        origin: header.remetente || "Origem não informada",
        destination: header.destinatario || "Destino não informado",
        productName: header.nro_nf ? `Nota Fiscal: ${header.nro_nf}` : `DANFE: ${accessKey}`,
        weight: undefined,
      };
    }
    
    const events: TrackingEvent[] = sswEventsData
      .map((event: any) => {
        let timestamp = new Date(0).toISOString(); // Default to epoch for invalid/missing dates
        if (event.data_hora && typeof event.data_hora === 'string') {
            try {
                const parsedDate = new Date(event.data_hora);
                // Check if date is valid
                if (!isNaN(parsedDate.getTime())) {
                    timestamp = parsedDate.toISOString();
                } else {
                    console.warn(`Timestamp inválido ('${event.data_hora}') para o evento. Usando epoch. Dados do evento:`, event);
                }
            } catch (e) {
                console.warn(`Erro ao parsear timestamp ('${event.data_hora}') para o evento. Usando epoch. Dados do evento:`, event, e);
            }
        } else if (event.data_hora) { // if it exists but not a string
             console.warn(`Timestamp ('${event.data_hora}') não é uma string. Usando epoch. Dados do evento:`, event);
        }

        return {
          timestamp: timestamp,
          status: event.ocorrencia || "Status Desconhecido",
          location: event.cidade || "Local Desconhecido",
          details: event.descricao || undefined, // descricao can be quite long
        };
      })
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const currentStatusEvent = events[0];
    let estimatedDelivery = "Não disponível";
    let calculatedWeight: string | undefined = undefined;

    // Try to parse estimated delivery and weight from the first event's description
    // This is typically the "DOCUMENTO DE TRANSPORTE EMITIDO" event
    const initialEvent = sswEventsData.find((e: any) => e.codigo_ssw === "80" || e.ocorrencia?.toUpperCase().includes("DOCUMENTO DE TRANSPORTE EMITIDO"));
    if (initialEvent && initialEvent.descricao) {
      const desc = initialEvent.descricao;
      
      // Regex for "Previsao de entrega: DD/MM/YY" or "DD/MM/YYYY"
      const deliveryMatch = desc.match(/Previsao de entrega: (\d{1,2}\/\d{1,2}\/\d{2,4})/i);
      if (deliveryMatch && deliveryMatch[1]) {
        const parsedEstDeliveryDate = parseSswDateForDelivery(deliveryMatch[1]);
        if (parsedEstDeliveryDate) {
            estimatedDelivery = new Date(parsedEstDeliveryDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric'});
        }
      }
      
      // Regex for "XX Kg" or "XX.YY Kg"
      const weightMatch = desc.match(/(\d+(\.\d+)?)\s*Kg/i);
      if (weightMatch && weightMatch[1]) {
        calculatedWeight = `${parseFloat(weightMatch[1]).toFixed(2)} kg`;
      }
    }
    
    const productName = header.nro_nf ? `Nota Fiscal: ${header.nro_nf}` : `DANFE: ${accessKey}`;

    const trackingInfo: TrackingInfo = {
      id: accessKey, // The full DANFE key used for the query
      carrier: carrierNameFromXml || defaultCarrierName,
      estimatedDelivery: estimatedDelivery,
      currentStatus: currentStatusEvent ? currentStatusEvent.status : "Informação de status indisponível",
      origin: header.remetente || "Origem não informada",
      destination: header.destinatario || "Destino não informado",
      productName: productName,
      weight: calculatedWeight,
      events: events,
    };

    return trackingInfo;

  } catch (error: any) {
    console.error("Erro ao buscar ou processar dados de rastreamento do SSW:", error);
    // Re-throw specific API or known errors
    if (error.message && (error.message.includes("API SSW") || 
                           error.message.includes("Falha ao buscar") || 
                           error.message.includes("Chave de rastreamento não encontrada"))) {
        throw error; 
    }
    // Fallback for other unexpected errors
    throw new Error("Ocorreu um erro inesperado ao buscar as informações de rastreamento. Verifique o console para detalhes.");
  }
};