// Payment status and method types
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';
export type PaymentMethod = 'venmo' | 'apple_pay' | 'google_pay';
export type PaymentType = 'event' | 'accommodation';

// Payment error interface
export interface PaymentError {
  code: string;
  message: string;
}

// Payment response interface
export interface PaymentResponse {
  success: boolean;
  paymentId?: string;
  error?: string;
  errorDetail?: PaymentError;
}

// Payment object interface
export interface Payment {
  id: string;
  userId: string;
  userName: string; // User's display name
  groopId: string;
  type: PaymentType;
  eventId?: string;
  amount: number;
  description: string;
  status: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
  method: PaymentMethod;
  paymentProof?: string;
  notes?: string;
}

// Payment item interface (combines event or accommodation with payment status)
export interface PaymentItem {
  id: string;
  title: string;
  description?: string;
  amountDue: number;
  totalCost?: number;
  isPaid: boolean;
  date?: string;
  paymentId?: string;
  type: PaymentType;
  eventType?: 'party' | 'food' | 'activity' | 'other'; // Added for icon differentiation
  optional?: boolean;
}

// Payment summary interface
export interface PaymentSummary {
  totalOwed: number;
  totalPaid: number;
  remaining: number;
}

// Add this interface to your payments.tsx model file
export interface EventData {
  id: string;
  title?: string;
  description?: string;
  date?: string;
  time?: string;
  isPaymentRequired?: boolean;
  costPerPerson?: number;
  totalCost?: number;
  isPaid?: boolean;
  type?: string;
  isOptional?: boolean;
  location?: string;
  attendees?: number;
  tags?: string[];
}