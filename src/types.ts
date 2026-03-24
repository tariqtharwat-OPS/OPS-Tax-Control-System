export type Role = 'Admin' | 'Finance' | 'Tax' | 'Site Manager' | 'Receiving Officer' | 'Purchasing Officer' | 'Viewer';

export interface UserProfile {
  uid: string;
  email: string;
  role: Role;
  locationId?: string; // Limit access to specific location
  displayName: string;
}

export interface Location {
  id: string; // Surabaya, Jakarta, etc
  name: string;
  siteCode: string;
  nitku: string;
}

export interface Supplier {
  id: string; // document id
  supplierId: string; // custom human readable ID
  type: 'fisherman' | 'collector' | 'company' | 'service_provider';
  name: string;
  nik?: string;
  npwp?: string;
  village?: string;
  island?: string;
  photoRef?: string;
  identityStatus: 'verified' | 'pending' | 'rejected' | 'fallback_accepted';
  isActive: boolean;
}

export interface PurchaseLineItem {
  id: string;
  species: string;
  size: string;
  grade: string;
  condition: string;
  weightKg: number;
  pricePerKg: number;
  totalValue: number;
}

export interface Purchase {
  id: string;
  transactionId: string;
  sourceDocRef?: string;
  purchaseDate: string;
  catchDate?: string;
  deliveryDate: string;
  supplierId: string;
  locationId: string;
  nitku: string;
  landingPoint: string;
  receivingLocation: string;
  batchId: string; // links to InventoryBatch
  receivingOfficerId: string;
  weighedBy: string;
  scaleId?: string;
  hasPhoto: boolean;
  photoRef?: string;
  paymentMethod: 'cash' | 'transfer' | 'pending';
  paymentRef?: string;
  paymentStatus: 'paid' | 'pending';
  notes?: string;
  escalationFlag: boolean;
  
  // Remote fisherman evidence
  hasDeclarationLetter: boolean;
  declarationRef?: string;
  hasWitness: boolean;
  witnessName?: string;
  witnessRole?: string;
  hasThumbprint: boolean;
  
  lineItems: PurchaseLineItem[];
  totalAmount: number;
  
  createdAt: string;
  createdBy: string;
}

export interface InventoryBatch {
  id: string;
  batchId: string;
  locationId: string;
  sourcePurchaseId?: string;
  species: string;
  size: string;
  grade: string;
  quantityReceived: number;
  quantityUsed: number;
  quantityTransferred: number;
  quantitySold: number;
  quantityRemaining: number;
  status: 'active' | 'depleted';
  createdAt: string;
}

export interface TransferLine {
  batchId: string;
  quantity: number;
}

export interface InternalTransfer {
  id: string;
  transferId: string;
  originLocationId: string;
  destinationLocationId: string;
  lines: TransferLine[];
  dispatchDate: string;
  receiveDate?: string;
  status: 'pending' | 'received' | 'cancelled';
  transportRef?: string;
  notes?: string;
}

export interface Payment {
  id: string;
  paymentId: string;
  transactionId: string; // e.g Purchase ID
  method: 'cash' | 'transfer';
  paymentRef: string;
  amount: number;
  date: string;
  approvedBy: string;
  status: 'completed' | 'pending' | 'rejected';
  proofRef?: string; // photo/document
  createdAt: string;
}

export interface ExportSupport {
  id: string;
  exportId: string;
  saleRef: string;
  commercialInvoiceRef: string;
  packingListRef: string;
  pebRef: string;
  blRef: string;
  remittanceProofRef: string;
  status: 'complete' | 'incomplete';
  batchLinks: string[]; // Batches included in this export
}
