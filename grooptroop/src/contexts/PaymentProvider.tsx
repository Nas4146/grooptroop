import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PaymentService } from '../services/PaymentService';
import { PaymentItem, PaymentSummary } from '../models/payments';
import { useGroop } from './GroopProvider';
import { useAuth } from './AuthProvider';

interface PaymentContextType {
  paymentItems: PaymentItem[];
  paymentSummary: PaymentSummary | null;
  loading: boolean;
  refreshPaymentData: () => Promise<void>;
  clearPaymentData: () => void;
}

const PaymentContext = createContext<PaymentContextType | undefined>(undefined);

export function PaymentProvider({ children }: { children: React.ReactNode }) {
  const { currentGroop } = useGroop();
  const { profile } = useAuth();
  const [paymentItems, setPaymentItems] = useState<PaymentItem[]>([]);
  const [paymentSummary, setPaymentSummary] = useState<PaymentSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const [isFetching, setIsFetching] = useState(false); // Prevent concurrent fetches

  const fetchPaymentData = useCallback(async (force: boolean = false) => {
    if (!currentGroop || !profile) return;

    // Prevent concurrent fetches
    if (isFetching) {
      console.log('[PAYMENT_CONTEXT] Fetch already in progress, skipping');
      return;
    }

    // Increase cache duration to 5 minutes for better performance
    const now = Date.now();
    if (!force && (now - lastFetchTime) < 300000 && paymentItems.length > 0) {
      console.log('[PAYMENT_CONTEXT] Using cached payment data');
      return;
    }

    try {
      setIsFetching(true);
      setLoading(true);
      console.log('[PAYMENT_CONTEXT] Fetching payment data');

      // Fetch both in parallel
      const [items, summary] = await Promise.all([
        PaymentService.getPaymentItems(currentGroop.id, profile.uid),
        PaymentService.getUserPaymentSummary(currentGroop.id, profile.uid)
      ]);

      // Sort items: pending first, then paid
      const sortedItems = [...items].sort((a, b) => {
        if (a.isPaid !== b.isPaid) {
          return a.isPaid ? 1 : -1;
        }
        if (a.type !== b.type) {
          return a.type === 'accommodation' ? -1 : 1;
        }
        return b.amountDue - a.amountDue;
      });

      setPaymentItems(sortedItems);
      setPaymentSummary(summary);
      setLastFetchTime(now);
      
      console.log(`[PAYMENT_CONTEXT] Loaded ${items.length} payment items`);
    } catch (error) {
      console.error('[PAYMENT_CONTEXT] Error fetching payment data:', error);
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  }, [currentGroop?.id, profile?.uid, isFetching, lastFetchTime, paymentItems.length]);

  const refreshPaymentData = useCallback(() => {
    console.log('[PAYMENT_CONTEXT] Force refreshing payment data');
    return fetchPaymentData(true);
  }, [fetchPaymentData]);

  const clearPaymentData = useCallback(() => {
    console.log('[PAYMENT_CONTEXT] Clearing payment data');
    setPaymentItems([]);
    setPaymentSummary(null);
    setLastFetchTime(0);
    setIsFetching(false);
  }, []);

  // Auto-fetch when groop or user changes - but only once per groop/user combo
  useEffect(() => {
    if (currentGroop?.id && profile?.uid) {
      console.log(`[PAYMENT_CONTEXT] Auto-fetching for groop: ${currentGroop.id}`);
      fetchPaymentData();
    } else {
      clearPaymentData();
    }
  }, [currentGroop?.id, profile?.uid]); // Remove fetchPaymentData from deps to prevent loops

  return (
    <PaymentContext.Provider value={{
      paymentItems,
      paymentSummary,
      loading,
      refreshPaymentData,
      clearPaymentData
    }}>
      {children}
    </PaymentContext.Provider>
  );
}

export function usePayment() {
  const context = useContext(PaymentContext);
  if (context === undefined) {
    throw new Error('usePayment must be used within a PaymentProvider');
  }
  return context;
}