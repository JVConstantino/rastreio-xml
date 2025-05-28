
import type { TrackingInfo, TrackingEvent } from '../types';

// Helper function to parse SSW date strings (dd/MM/yyyy HH:mm:ss or dd/MM/yyyy) to ISO string
const parseSswDate = (dateString: string | null | undefined): string => {
  if (!dateString) return new Date().toISOString(); // Should ideally not happen for event dates

  const parts = dateString.split(' ');
  const dateParts = parts[0].split('/');
  const day = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10) - 1; // Month is 0-indexed in JS Date
  const year = parseInt(dateParts[2], 10);

  if (parts.length > 1 && parts[1]) { // Check if time part exists and is not empty
    const timeParts = parts[1].split(':');
    const hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);
    const seconds = parseInt(timeParts[2], 10);
    return new Date(year, month, day, hours, minutes, seconds).toISOString();
  }
  return new Date(year, month, day).toISOString();
};


export const fetchTrackingData = async (accessKey: string): Promise<TrackingInfo> => {
  const apiUrl = `https://ssw.inf.br/api/trackingdanfe/${accessKey}`;

  try {
    const response = await fetch(apiUrl);

    if (!response.ok) {
      // Attempt to parse error from SSW if available
      try {
        const errorData = await response.json();
        if (errorData && errorData.message) {
          throw new Error(`SSW API Error: ${errorData.message} (Status: ${response.status})`);
        }
      } catch (e) {
        // Ignore parsing error, throw generic HTTP error
      }
      throw new Error(`Failed to fetch tracking data from SSW. Status: ${response.status}`);
    }

    const sswResponse = await response.json();

    if (!sswResponse.success) {
      throw new Error(sswResponse.message || "Tracking key not found or invalid at SSW.");
    }

    const sswResult = sswResponse.result?.[0]; // SSW API returns result as an array with one element
    if (!sswResult || !sswResult.eventos) {
        throw new Error("Invalid data structure received from SSW API.");
    }
    
    const events: TrackingEvent[] = sswResult.eventos.map((event: any) => ({
      timestamp: parseSswDate(event.dataHora),
      status: event.descricao || event.codigo, // Use description if available, else code
      location: event.unidade?.nome || event.unidade?.cidade || 'N/A',
      details: event.observacao || (event.unidade?.endereco ? `${event.unidade.endereco.logradouro}, ${event.unidade.endereco.numero}` : undefined),
    })).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()); // Ensure events are sorted descending by time

    const currentStatusEvent = events[0]; // Latest event after sorting

    const trackingInfo: TrackingInfo = {
      id: sswResult.danfe?.chave || accessKey,
      carrier: sswResult.transportadora?.nomeFantasia || sswResult.transportadora?.razaoSocial || "SSW Transportes",
      estimatedDelivery: sswResult.previsaoEntrega ? parseSswDate(sswResult.previsaoEntrega) : "Not available",
      currentStatus: currentStatusEvent ? currentStatusEvent.status : "Information unavailable",
      origin: sswResult.remetente?.nome || "Origin N/A",
      destination: sswResult.destinatario?.nome || "Destination N/A",
      productName: `Nota Fiscal: ${sswResult.danfe?.numero || 'N/A'} Série: ${sswResult.danfe?.serie || 'N/A'}`, // Example of using other data
      weight: sswResult.volumes && sswResult.volumes.length > 0 ? `${sswResult.volumes.reduce((acc: number, vol: any) => acc + (parseFloat(vol.pesoBruto) || 0), 0).toFixed(2)} kg` : undefined,
      events: events,
    };

    return trackingInfo;

  } catch (error: any) {
    console.error("Error fetching or processing SSW tracking data:", error);
    throw new Error(error.message || "An unexpected error occurred while fetching tracking information.");
  }
};
