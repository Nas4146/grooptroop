import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator, 
  SafeAreaView,
  RefreshControl
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useGroop } from '../contexts/GroopProvider';
import { useAuth } from '../contexts/AuthProvider';
import { PaymentService } from '../services/PaymentService';
import PaymentSheet from '../components/payments/PaymentSheet';
import { PaymentItem } from '../models/payments';
import tw from '../utils/tw';

export default function PaymentsScreen() {
  const { currentGroop } = useGroop();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paymentItems, setPaymentItems] = useState<PaymentItem[]>([]);
  const [totalOwed, setTotalOwed] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);
  const [paymentSheetVisible, setPaymentSheetVisible] = useState(false);
  const [selectedPaymentItem, setSelectedPaymentItem] = useState<PaymentItem | null>(null);

  // Fetch payment data
  const fetchPayments = async () => {
    if (!currentGroop || !profile) {
      setLoading(false);
      return;
    }
    
    try {
      console.log('[PAYMENTS_SCREEN] Fetching payment items');
      setLoading(true);
      
      // Get all payment items
      const items = await PaymentService.getPaymentItems(currentGroop.id, profile.uid);
      setPaymentItems(items);
      
      // Calculate totals
      const summary = await PaymentService.getUserPaymentSummary(currentGroop.id, profile.uid);
      setTotalOwed(summary.totalOwed);
      setTotalPaid(summary.totalPaid);
      
      console.log(`[PAYMENTS_SCREEN] Payment summary: Total: $${summary.totalOwed}, Paid: $${summary.totalPaid}, Remaining: $${summary.remaining}`);
    } catch (error) {
      console.error('[PAYMENTS_SCREEN] Error fetching payments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (currentGroop && profile) {
      fetchPayments();
    }
  }, [currentGroop, profile]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPayments();
  };

  const handlePayItem = (item: PaymentItem) => {
    if (item.isPaid) return;
    
    console.log(`[PAYMENTS_SCREEN] Opening payment sheet for item: ${item.title}`);
    setSelectedPaymentItem(item);
    setPaymentSheetVisible(true);
  };
  
  const handlePayAll = () => {
    const remaining = totalOwed - totalPaid;
    if (remaining <= 0) return;
    
    console.log('[PAYMENTS_SCREEN] Opening payment sheet for all remaining balance');
    setSelectedPaymentItem({
      id: 'all',
      title: 'Remaining Balance',
      description: 'Payment for all remaining trip costs',
      amountDue: remaining,
      isPaid: false,
      type: 'accommodation' // Default, doesn't affect anything
    });
    setPaymentSheetVisible(true);
  };
  
  const closePaymentSheet = (paymentCompleted: boolean = false) => {
    setPaymentSheetVisible(false);
    
    // Only refresh data if a payment was actually completed
    if (paymentCompleted) {
      console.log('[PAYMENTS_SCREEN] Payment completed, refreshing data');
      setTimeout(() => {
        fetchPayments();
      }, 500);
    }
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={tw`flex-1 justify-center items-center bg-light`}>
        <ActivityIndicator size="large" color="#7C3AED" />
        <Text style={tw`mt-4 text-primary`}>Loading payment information...</Text>
      </SafeAreaView>
    );
  }

  if (!currentGroop) {
    return (
      <SafeAreaView style={tw`flex-1 justify-center items-center bg-light`}>
        <Ionicons name="wallet-outline" size={64} color="#CBD5E1" />
        <Text style={tw`text-xl font-bold text-gray-800 mt-4`}>No Active Trip</Text>
        <Text style={tw`text-gray-600 text-center mt-2 mx-10`}>
          Select a trip to view and manage payments
        </Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={tw`flex-1 bg-light`}>
      <View style={tw`flex-row justify-between items-center p-4 border-b border-gray-200`}>
        <Text style={tw`text-2xl font-bold text-neutral`}>Payments</Text>
        <Text style={tw`text-base text-gray-500`}>{currentGroop.name}</Text>
      </View>
      
      <FlatList
        data={paymentItems}
        keyExtractor={item => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListHeaderComponent={() => (
          <View style={tw`px-4 py-4`}>
            {/* Payment Summary Card */}
            <View style={tw`bg-white rounded-xl shadow-sm p-4 mb-4`}>
              <Text style={tw`text-lg font-bold text-neutral mb-3`}>Payment Summary</Text>
              
              <View style={tw`flex-row justify-between items-center mb-4`}>
                <View>
                  <Text style={tw`text-xs text-gray-500 mb-1`}>Total Paid</Text>
                  <Text style={tw`text-lg font-bold text-green-600`}>${totalPaid.toFixed(2)}</Text>
                </View>
                <View>
                  <Text style={tw`text-xs text-gray-500 mb-1`}>Total Owed</Text>
                  <Text style={tw`text-lg font-bold text-neutral`}>${totalOwed.toFixed(2)}</Text>
                </View>
                <View>
                  <Text style={tw`text-xs text-gray-500 mb-1`}>Remaining</Text>
                  <Text style={tw`text-lg font-bold text-secondary`}>
                    ${(totalOwed - totalPaid).toFixed(2)}
                  </Text>
                </View>
              </View>
              
              {/* Progress bar */}
              <View style={tw`h-2 bg-gray-200 rounded-full overflow-hidden mb-4`}>
                <View 
                  style={[
                    tw`h-full bg-green-500 rounded-full`,
                    { width: `${totalOwed > 0 ? Math.min(100, (totalPaid / totalOwed) * 100) : 100}%` }
                  ]} 
                />
              </View>
              
              {/* Pay all button */}
              {totalPaid < totalOwed ? (
                <TouchableOpacity 
                  style={tw`bg-primary rounded-lg py-3 items-center`}
                  onPress={handlePayAll}
                >
                  <Text style={tw`text-white font-bold`}>
                    Pay All (${(totalOwed - totalPaid).toFixed(2)})
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={tw`bg-green-50 rounded-lg p-3 flex-row items-center justify-center`}>
                  <Ionicons name="checkmark-circle" size={20} color="#10B981" style={tw`mr-2`} />
                  <Text style={tw`text-green-700 font-medium`}>All Payments Complete</Text>
                </View>
              )}
            </View>
            
            <Text style={tw`text-sm font-medium text-gray-500 mb-2`}>YOUR PAYMENTS</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={tw`mx-4 mb-3 bg-white rounded-lg shadow-sm p-4 flex-row items-center`}
            onPress={() => handlePayItem(item)}
            disabled={item.isPaid}
          >
            <View style={tw`mr-3 ${item.isPaid ? 'bg-green-100' : item.type === 'accommodation' ? 'bg-blue-100' : 'bg-amber-100'} p-3 rounded-full`}>
              <Ionicons 
                name={item.type === 'accommodation' ? 'home-outline' : 'calendar-outline'} 
                size={20} 
                color={item.isPaid ? '#10B981' : item.type === 'accommodation' ? '#3B82F6' : '#F59E0B'} 
              />
            </View>
            
            <View style={tw`flex-1`}>
              <Text style={tw`text-base font-medium text-neutral`}>{item.title}</Text>
              {item.description && (
                <Text style={tw`text-sm text-gray-500`} numberOfLines={1}>
                  {item.description}
                </Text>
              )}
              {item.date && (
                <Text style={tw`text-xs text-gray-400`}>{item.date}</Text>
              )}
            </View>
            
            <View style={tw`items-end ml-3`}>
              <Text style={tw`font-bold ${item.isPaid ? 'text-green-600' : 'text-secondary'}`}>
                ${item.amountDue.toFixed(2)}
              </Text>
              <View style={tw`mt-1 flex-row items-center`}>
                {item.isPaid ? (
                  <>
                    <View style={tw`h-2.5 w-2.5 rounded-full bg-green-500 mr-1.5`} />
                    <Text style={tw`text-xs text-gray-500`}>Paid</Text>
                  </>
                ) : (
                  <>
                    <View style={tw`h-2.5 w-2.5 rounded-full bg-amber-500 mr-1.5`} />
                    <Text style={tw`text-xs text-gray-500`}>Pending</Text>
                  </>
                )}
              </View>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <View style={tw`py-10 items-center justify-center`}>
            <Ionicons name="receipt-outline" size={64} color="#CBD5E1" />
            <Text style={tw`text-gray-600 mt-4 text-center`}>
              No payment items found
            </Text>
          </View>
        )}
      />
      
      {/* Payment Sheet Modal */}
      {selectedPaymentItem && (
        <PaymentSheet
          visible={paymentSheetVisible}
          onClose={closePaymentSheet}  // This now accepts a boolean parameter
          groopId={currentGroop.id}
          eventId={selectedPaymentItem.type === 'event' ? selectedPaymentItem.id : undefined}
          amount={selectedPaymentItem.amountDue}
          description={selectedPaymentItem.description || selectedPaymentItem.title}
          title={`Pay for ${selectedPaymentItem.title}`}
        />
      )}
    </SafeAreaView>
  );
}