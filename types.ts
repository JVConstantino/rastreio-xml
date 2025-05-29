
export interface TrackingEvent {
  timestamp: string; // Should be in ISO 8601 format (e.g., "2024-07-28T10:15:00Z")
  status: string;
  location: string;
  details?: string;
}

export interface XmlVolumeInfo {
  quantity?: number;
  species?: string;
  netWeight?: number;
  grossWeight?: number;
}

export interface XmlInvoiceInfo {
  number?: string;
  originalValue?: number;
  discountValue?: number;
  netValue?: number;
}

export interface XmlInstallmentInfo {
  number?: string;
  dueDate?: string; // YYYY-MM-DD from XML, format in component
  value?: number;
}

export interface TrackingInfo {
  id: string; // DANFE Access Key
  carrier: string;
  estimatedDelivery: string; // Should be in ISO 8601 date format (e.g., "2024-07-28") or a descriptive string
  currentStatus: string;
  events: TrackingEvent[];
  origin: string; // Sender's name or location
  destination: string; // Recipient's name or location
  productName?: string; // e.g., Invoice details
  weight?: string; // e.g., "2.5kg" - This is parsed from SSW event description

  // New fields for XML-specific data
  xmlVolumeInfo?: XmlVolumeInfo;
  xmlInvoiceInfo?: XmlInvoiceInfo;
  xmlInstallments?: XmlInstallmentInfo[];
}