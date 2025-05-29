
// utils/xmlParser.ts
import type { XmlVolumeInfo, XmlInvoiceInfo, XmlInstallmentInfo } from '../types';

export interface ParsedXmlData {
  accessKey: string;
  carrierName?: string;
  volumeInfo?: XmlVolumeInfo;
  invoiceInfo?: XmlInvoiceInfo;
  installments?: XmlInstallmentInfo[];
}

// Helper function to safely get text content and convert to number
const getNumericContent = (element: Element | null | undefined, selector: string): number | undefined => {
  const text = element?.querySelector(selector)?.textContent;
  if (text) {
    const num = parseFloat(text);
    return isNaN(num) ? undefined : num;
  }
  return undefined;
};

// Helper function to safely get text content
const getTextContent = (element: Element | null | undefined, selector: string): string | undefined => {
  return element?.querySelector(selector)?.textContent?.trim() || undefined;
};


export const parseXmlAndExtractAccessKey = (file: File): Promise<ParsedXmlData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const xmlString = e.target?.result as string;
        if (!xmlString) {
          reject(new Error("Falha ao ler o conteúdo do arquivo XML."));
          return;
        }

        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "application/xml");

        const parserError = xmlDoc.querySelector("parsererror");
        if (parserError) {
          console.error("XML Parsing Error Details:", parserError.textContent);
          reject(new Error("Arquivo XML inválido ou mal formatado. Verifique o console do navegador para mais detalhes."));
          return;
        }
        
        const infNFeBaseSelectors = ["nfeProc > NFe > infNFe", "NFe > infNFe", "infNFe"];
        let infNFeElement: Element | null = null;
        for (const selector of infNFeBaseSelectors) {
            infNFeElement = xmlDoc.querySelector(selector);
            if (infNFeElement) break;
        }

        if (!infNFeElement) {
            reject(new Error("Elemento 'infNFe' não encontrado no XML. Não é possível extrair informações."));
            return;
        }
        
        let accessKey: string | null = null;
        // Try extracting from chNFe attribute of infProt first (most reliable for processed NFe)
        const protNFeSelectors = ["nfeProc > protNFe > infProt", "protNFe > infProt"];
        for (const selector of protNFeSelectors) {
            const infProtElement = xmlDoc.querySelector(selector);
            if (infProtElement) {
                accessKey = infProtElement.querySelector("chNFe")?.textContent?.trim() || null;
                if (accessKey && accessKey.length === 44 && /^\d+$/.test(accessKey)) break;
                accessKey = null;
            }
        }
        
        // Fallback to Id attribute of infNFe or direct chNFe child of infNFe
        if (!accessKey) {
            const idAttr = infNFeElement.getAttribute("Id");
            if (idAttr) {
                if (idAttr.toUpperCase().startsWith("NFE") && idAttr.length === 47) {
                    accessKey = idAttr.substring(3);
                } else if (idAttr.length === 44 && /^\d+$/.test(idAttr)) {
                    accessKey = idAttr;
                }
            }
            if (!accessKey || !(accessKey.length === 44 && /^\d+$/.test(accessKey))) {
                 accessKey = infNFeElement.querySelector("chNFe")?.textContent?.trim() || null;
            }
        }


        if (!accessKey || !(accessKey.length === 44 && /^\d+$/.test(accessKey))) {
          if (accessKey) { 
             reject(new Error(`Chave encontrada ("${accessKey.substring(0,20)}...") mas não é uma chave de acesso válida (44 dígitos numéricos).`));
          } else {
             reject(new Error("Chave de acesso (chNFe ou Id da NFe) não encontrada no XML. Verifique se o arquivo é um XML de NF-e válido e contém a chave."));
          }
          return;
        }

        // Extract Carrier Name (Transportadora)
        let carrierName: string | undefined = getTextContent(infNFeElement, "transp > transporta > xNome");
        
        // Extract Volume Information (infNFe > transp > vol)
        // Assuming one 'vol' element for simplicity, or summing if multiple (though NFe usually has one structure or repeated vol for multiple items)
        const volElement = infNFeElement.querySelector("transp > vol");
        let volumeInfo: XmlVolumeInfo | undefined = undefined;
        if (volElement) {
            volumeInfo = {
                quantity: getNumericContent(volElement, "qVol"),
                species: getTextContent(volElement, "esp"),
                netWeight: getNumericContent(volElement, "pesoL"),
                grossWeight: getNumericContent(volElement, "pesoB"),
            };
        }

        // Extract Invoice Information (infNFe > cobr > fat)
        const fatElement = infNFeElement.querySelector("cobr > fat");
        let invoiceInfo: XmlInvoiceInfo | undefined = undefined;
        if (fatElement) {
            invoiceInfo = {
                number: getTextContent(fatElement, "nFat"),
                originalValue: getNumericContent(fatElement, "vOrig"),
                discountValue: getNumericContent(fatElement, "vDesc"),
                netValue: getNumericContent(fatElement, "vLiq"),
            };
        }

        // Extract Installments (Duplicatas) (infNFe > cobr > dup)
        const dupElements = infNFeElement.querySelectorAll("cobr > dup");
        let installments: XmlInstallmentInfo[] | undefined = undefined;
        if (dupElements && dupElements.length > 0) {
            installments = Array.from(dupElements).map(dup => ({
                number: getTextContent(dup, "nDup"),
                dueDate: getTextContent(dup, "dVenc"), // YYYY-MM-DD
                value: getNumericContent(dup, "vDup"),
            })).filter(dup => dup.number || dup.dueDate || dup.value); // Filter out empty ones
            if(installments.length === 0) installments = undefined;
        }
        
        resolve({ accessKey, carrierName, volumeInfo, invoiceInfo, installments });

      } catch (parseError: any) {
        console.error("Error processing XML file:", parseError);
        reject(new Error(`Erro ao processar o arquivo XML: ${parseError.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error("Falha ao ler o arquivo XML. Certifique-se de que o arquivo é válido e tente novamente."));
    };

    reader.readAsText(file);
  });
};