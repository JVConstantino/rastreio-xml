
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { TrackingInfo } from '../types';

const apiKey = process.env.API_KEY;

if (!apiKey) {
  console.warn(
    "Chave da API Gemini não encontrada. O resumo da IA não funcionará. " +
    "Por favor, defina a variável de ambiente API_KEY."
  );
}

const ai = new GoogleGenAI({ apiKey: apiKey || "MISSING_API_KEY_PLACEHOLDER" }); 
const modelName = 'gemini-2.5-flash-preview-04-17';

const formatTrackingDataForPrompt = (trackingInfo: TrackingInfo): string => {
  let promptData = `ID do Pacote/Nota Fiscal: ${trackingInfo.id}\n`;
  promptData += `Transportadora: ${trackingInfo.carrier}\n`;
  if (trackingInfo.productName) promptData += `Conteúdo/Detalhes: ${trackingInfo.productName}\n`;
  promptData += `Status Atual: ${trackingInfo.currentStatus}\n`;

  // Estimated delivery is now pre-formatted or "Não disponível"
  promptData += `Previsão de Entrega: ${trackingInfo.estimatedDelivery}\n`;
  
  promptData += `Origem: ${trackingInfo.origin}\n`;
  promptData += `Destino: ${trackingInfo.destination}\n`;
  if (trackingInfo.weight) promptData += `Peso: ${trackingInfo.weight}\n`;
  
  promptData += "Histórico de Eventos (mais recentes primeiro):\n";
  const eventsToShow = trackingInfo.events.slice(0, 5); // Show latest 5 events
  
  if (eventsToShow.length === 0) {
    promptData += "- Nenhum evento de rastreamento registrado.\n";
  } else {
    eventsToShow.forEach(event => {
      let formattedTimestamp = "Data/Hora do evento não fornecida";
      // Check if timestamp is the default epoch, indicating it was a fallback
      if (new Date(event.timestamp).getTime() !== new Date(0).getTime() || event.timestamp === new Date(0).toISOString()) {
        try {
            formattedTimestamp = new Date(event.timestamp).toLocaleString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        } catch (e) {
            // Keep "Data/Hora do evento não fornecida" if parsing fails
        }
      }
      promptData += `- ${formattedTimestamp}: ${event.status} em ${event.location}${event.details ? ` (${event.details})` : ''}\n`;
    });
  }

  if (trackingInfo.events.length > 5) {
    promptData += `(... e mais ${trackingInfo.events.length - 5} eventos anteriores)\n`;
  }
  return promptData;
};

export const summarizeTrackingWithGemini = async (trackingInfo: TrackingInfo): Promise<string> => {
  if (!apiKey || apiKey === "MISSING_API_KEY_PLACEHOLDER") {
    return "Resumo da IA indisponível: Chave da API Gemini não configurada ou ausente.";
  }

  const formattedData = formatTrackingDataForPrompt(trackingInfo);
  const prompt = `
Você é um assistente virtual que fornece um resumo conciso do rastreamento de encomendas para um cliente.
Com base nos seguintes dados de rastreamento, forneça uma atualização amigável e breve em português do Brasil.
Concentre-se no status atual, previsão de entrega (se disponível) e quaisquer eventos recentes importantes.
Evite jargões. Mantenha o resumo em 2-3 frases.

Dados de Rastreamento:
${formattedData}

Resumo Conciso:
`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
    });
    
    const summary = response.text;
    if (!summary) {
        throw new Error("Recebido um resumo vazio do Gemini.");
    }
    return summary.trim();

  } catch (error) {
    console.error("Erro ao chamar a API Gemini:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    if (errorMessage.toLowerCase().includes("api key not valid") || errorMessage.toLowerCase().includes("api_key_invalid")) {
        return "Resumo da IA indisponível: Chave da API Gemini inválida. Por favor, verifique sua configuração.";
    }
    if (errorMessage.toLowerCase().includes("quota") || errorMessage.toLowerCase().includes("resource has been exhausted")) {
        return "Resumo da IA indisponível no momento devido a limites de uso. Tente novamente mais tarde.";
    }
    return `O resumo da IA não pôde ser gerado. (Detalhe: ${errorMessage})`;
  }
};
