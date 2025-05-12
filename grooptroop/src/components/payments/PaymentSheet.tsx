import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  Modal,
  StyleSheet,
  Animated,
  Linking,
  Platform,
  KeyboardAvoidingView,
  AppState,
  AppStateStatus
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthProvider';
import { PaymentService } from '../../services/PaymentService';
import tw from '../../utils/tw';
import { PaymentResponse } from '../../models/payments';

interface PaymentSheetProps {
  visible: boolean;
  onClose: (paymentCompleted?: boolean) => void;  // Updated to accept payment status
  groopId: string;
  eventId?: string;
  amount: number;
  description: string;
  title?: string;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.4)'
  },
  contentContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: '60%',
    maxHeight: '95%' // Allow room for keyboard
  }
});

export default function PaymentSheet({
  visible,
  onClose,
  groopId,
  eventId,
  amount,
  description,
  title = 'Payment Details'
}: PaymentSheetProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [paymentInitiated, setPaymentInitiated] = useState(false);
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [initialAppCheck, setInitialAppCheck] = useState(true);
  
  // Animation values
  const slideAnim = useRef(new Animated.Value(0)).current;
  const venmoButtonScale = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    if (visible) {
      // Reset state when opening
      setPaymentInitiated(false);
      setPaymentId(null);
      setPaymentSuccess(false);
      setPaymentFailed(false);
      setErrorMessage('');
      
      // Slide up animation
      Animated.spring(slideAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
        tension: 40
      }).start();
    } else {
      // Slide down animation
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true
      }).start();
    }
  }, [visible]);

  // Handle app state changes for Venmo return
  useEffect(() => {
    if (paymentInitiated && paymentId) {
      console.log('[PAYMENT_SHEET] Setting up AppState listener for Venmo return');
      
      // Set up the AppState listener when payment is initiated
      const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
        // Skip initial state change when component mounts
        if (initialAppCheck) {
          setInitialAppCheck(false);
          return;
        }
        
        // Check if app is coming to the foreground
        if (nextAppState === 'active') {
          console.log('[PAYMENT_SHEET] App returned to foreground after Venmo');
          
          // Optionally show a reminder to confirm payment
          setTimeout(() => {
            Alert.alert(
              'Payment Reminder', 
              'Did you complete your Venmo payment? Please confirm to update your payment status.',
              [
                {
                  text: 'Not Yet',
                  style: 'cancel'
                },
                {
                  text: 'Yes, Confirm Payment',
                  onPress: handleConfirmPayment
                }
              ]
            );
          }, 500);
        }
      });
      
      // Return cleanup function
      return () => {
        console.log('[PAYMENT_SHEET] Removing AppState listener');
        subscription.remove();
      };
    }
  }, [paymentInitiated, paymentId, initialAppCheck]);

  const handleInitiateVenmoPayment = async () => {
    if (!profile) {
      Alert.alert('Error', 'You need to be logged in to make a payment');
      return;
    }
    
    setLoading(true);
    setPaymentFailed(false);
    setErrorMessage('');
    
    try {
      // Animate the button press
      Animated.sequence([
        Animated.timing(venmoButtonScale, {
          toValue: 0.96,
          duration: 100,
          useNativeDriver: true
        }),
        Animated.timing(venmoButtonScale, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true
        })
      ]).start();
      
      console.log('[PAYMENT_SHEET] Initiating Venmo payment');
      
      const result = await PaymentService.initiateVenmoPayment(
        groopId,
        eventId,
        amount,
        description,
        profile.uid,
        profile.displayName || 'User'
      );
      
      if (result.success && result.paymentId) {
        console.log(`[PAYMENT_SHEET] Payment initiated with ID: ${result.paymentId}`);
        setPaymentId(result.paymentId);
        setPaymentInitiated(true);
        setInitialAppCheck(true); // Reset app state check for new payment
      } else {
        console.error('[PAYMENT_SHEET] Failed to initiate payment:', result.error);
        setPaymentFailed(true);
        setErrorMessage(result.error || 'Failed to initiate payment');
        Alert.alert('Payment Error', result.error || 'Failed to initiate payment');
      }
    } catch (error) {
      console.error('[PAYMENT_SHEET] Error initiating Venmo payment:', error);
      setPaymentFailed(true);
      setErrorMessage('An unexpected error occurred');
      Alert.alert('Payment Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };
  
  const handleConfirmPayment = async () => {
    if (!paymentId) return;
    
    setConfirmLoading(true);
    
    try {
      console.log(`[PAYMENT_SHEET] Confirming payment: ${paymentId}`);
      const success = await PaymentService.confirmPayment(paymentId, groopId);
      
      if (success) {
        console.log('[PAYMENT_SHEET] Payment confirmed successfully');
        setPaymentSuccess(true);
        setPaymentFailed(false);
        
        // Auto-close after success with payment status = true
        setTimeout(() => {
          onClose(true);  // Pass true to indicate payment completed
        }, 2000);
      } else {
        console.error('[PAYMENT_SHEET] Failed to confirm payment');
        setPaymentFailed(true);
        setErrorMessage('Failed to confirm payment. Please try again.');
        Alert.alert('Error', 'Failed to confirm payment. Please try again.');
      }
    } catch (error) {
      console.error('[PAYMENT_SHEET] Error confirming payment:', error);
      setPaymentFailed(true);
      setErrorMessage('An unexpected error occurred');
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setConfirmLoading(false);
    }
  };
  
  const handleCancelPayment = async () => {
    if (!paymentId) {
      onClose(false);  // Pass false to indicate no payment completed
      return;
    }
    
    try {
      console.log(`[PAYMENT_SHEET] Cancelling payment: ${paymentId}`);
      await PaymentService.cancelPayment(paymentId, groopId);
      onClose(false);  // Pass false to indicate no payment completed
    } catch (error) {
      console.error('[PAYMENT_SHEET] Error cancelling payment:', error);
      onClose(false);  // Still pass false since no payment completed
    }
  };
  
  const handleTryAgain = () => {
    setPaymentFailed(false);
    setErrorMessage('');
  };

  // Handle the standard close button with payment status = false
  const handleCloseModal = () => {
    onClose(false);  // No payment was completed
  };
  
  const translateY = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [600, 0]
  });

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={handleCloseModal}  
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={tw`absolute inset-0 bg-black bg-opacity-50`} 
          activeOpacity={1}
          onPress={!paymentInitiated ? (event) => handleCloseModal() : undefined}
        />
        
        <Animated.View 
          style={[
            styles.contentContainer,
            { transform: [{ translateY }] }
          ]}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={tw`flex-1`}
          >
            {/* Header */}
            <View style={tw`flex-row justify-between items-center p-4 border-b border-gray-200`}>
              <Text style={tw`text-lg font-bold text-gray-800`}>{title}</Text>
              
              {!paymentInitiated && (
                <TouchableOpacity onPress={handleCloseModal}>
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              )}
            </View>
            
            {/* Body */}
            <View style={tw`p-4`}>
              {paymentSuccess ? (
                // Success state
                <View style={tw`items-center py-6`}>
                  <View style={tw`h-16 w-16 rounded-full bg-green-100 items-center justify-center mb-4`}>
                    <Ionicons name="checkmark-circle" size={40} color="#10B981" />
                  </View>
                  <Text style={tw`text-xl font-bold text-green-600 mb-2`}>Payment Confirmed!</Text>
                  <Text style={tw`text-center text-gray-600`}>
                    Your payment of ${amount.toFixed(2)} has been recorded.
                  </Text>
                </View>
              ) : paymentFailed ? (
                // Error state
                <View style={tw`py-3`}>
                  <View style={tw`bg-red-50 p-4 rounded-lg mb-4`}>
                    <View style={tw`flex-row items-center mb-3`}>
                      <View style={tw`h-2.5 w-2.5 rounded-full bg-red-500 mr-2`} />
                      <Text style={tw`text-red-800 font-medium text-base`}>
                        Payment Failed
                      </Text>
                    </View>
                    <Text style={tw`text-red-800 mb-2`}>
                      {errorMessage || 'There was a problem processing your payment.'}
                    </Text>
                  </View>
                  
                  <TouchableOpacity
                    style={tw`bg-primary py-3.5 px-4 rounded-lg w-full mb-3`}
                    onPress={handleTryAgain}
                  >
                    <Text style={tw`text-white font-bold text-center`}>
                      Try Again
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={tw`py-2 px-4 rounded-lg w-full`}
                    onPress={(event) => handleCloseModal()}
                  >
                    <Text style={tw`text-gray-600 text-center`}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : paymentInitiated ? (
                // Payment initiated, waiting for confirmation
                <View style={tw`py-3`}>
                  <View style={tw`bg-blue-50 p-4 rounded-lg mb-4`}>
                    <View style={tw`flex-row items-center mb-3`}>
                      <View style={tw`h-2.5 w-2.5 rounded-full bg-blue-500 mr-2`} />
                      <Text style={tw`text-blue-800 font-medium text-base`}>
                        Payment in progress
                      </Text>
                    </View>
                    <Text style={tw`text-blue-800 mb-2`}>
                      We've opened Venmo for you to make a payment of ${amount.toFixed(2)} to the trip organizer.
                    </Text>
                    <Text style={tw`text-blue-800 font-medium`}>
                      After completing payment in Venmo, return here to confirm.
                    </Text>
                  </View>
                  
                  <TouchableOpacity
                    style={tw`bg-green-500 py-3.5 px-4 rounded-lg w-full mb-3`}
                    onPress={handleConfirmPayment}
                    disabled={confirmLoading}
                  >
                    {confirmLoading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={tw`text-white font-bold text-center`}>
                        I've Completed the Payment
                      </Text>
                    )}
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={tw`py-2 px-4 rounded-lg w-full`}
                    onPress={handleCancelPayment}
                    disabled={confirmLoading}
                  >
                    <Text style={tw`text-gray-600 text-center`}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                // Initial payment options screen
                <View>
                  {/* Payment details */}
                  <View style={tw`bg-gray-50 rounded-lg p-4 mb-6`}>
                    <Text style={tw`text-base font-medium text-gray-800 mb-1`}>
                      {description}
                    </Text>
                    <Text style={tw`text-2xl font-bold text-primary mb-3`}>
                      ${amount.toFixed(2)}
                    </Text>
                    <View style={tw`flex-row items-center`}>
                      <Ionicons name="shield-checkmark-outline" size={16} color="#10B981" />
                      <Text style={tw`text-sm text-gray-600 ml-1`}>
                        Secure payment to trip organizer
                      </Text>
                    </View>
                  </View>
                  
                  {/* Payment method options */}
                  <Text style={tw`text-sm font-medium text-gray-500 mb-3`}>
                    SELECT PAYMENT METHOD
                  </Text>
                  
                  {/* Venmo Option */}
                  <Animated.View style={{ transform: [{ scale: venmoButtonScale }] }}>
                    <TouchableOpacity
                      style={tw`flex-row items-center bg-[#3D95CE] rounded-lg py-4 px-5 mb-3`}
                      onPress={handleInitiateVenmoPayment}
                      disabled={loading}
                    >
                      <View style={tw`h-6 w-6 bg-white rounded-full items-center justify-center mr-3`}>
                        <Text style={tw`text-[#3D95CE] font-bold text-xs`}>V</Text>
                      </View>
                      <Text style={tw`text-white font-bold flex-grow`}>Pay with Venmo</Text>
                      {loading ? (
                        <ActivityIndicator color="white" />
                      ) : (
                        <Ionicons name="arrow-forward" size={20} color="white" />
                      )}
                    </TouchableOpacity>
                  </Animated.View>
                  
                  {/* Apple Pay option (disabled in Phase 1) */}
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity
                      style={tw`flex-row items-center border border-gray-300 rounded-lg py-4 px-5 mb-3 opacity-50`}
                      disabled={true}
                    >
                      <Ionicons name="logo-apple" size={20} color="#000" style={tw`mr-3`} />
                      <Text style={tw`text-gray-700 font-bold flex-grow`}>Apple Pay (Coming Soon)</Text>
                      <Ionicons name="lock-closed" size={16} color="#666" />
                    </TouchableOpacity>
                  )}
                  
                  {/* Google Pay option (disabled in Phase 1) */}
                  {Platform.OS === 'android' && (
                    <TouchableOpacity
                      style={tw`flex-row items-center border border-gray-300 rounded-lg py-4 px-5 mb-3 opacity-50`}
                      disabled={true}
                    >
                      <Ionicons name="logo-google" size={20} color="#4285F4" style={tw`mr-3`} />
                      <Text style={tw`text-gray-700 font-bold flex-grow`}>Google Pay (Coming Soon)</Text>
                      <Ionicons name="lock-closed" size={16} color="#666" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
            
            {/* Footer with security message */}
            <View style={tw`px-4 pb-6 pt-2 mt-auto`}>
              <View style={tw`flex-row items-center justify-center`}>
                <Ionicons name="shield-checkmark-outline" size={14} color="#6B7280" />
                <Text style={tw`text-xs text-gray-500 ml-1 text-center`}>
                  {(Platform.OS === 'ios' && paymentInitiated) ? 
                    "Return to GroopTroop after completing payment in Venmo" :
                    "Secure payments powered by Venmo. Your transaction is protected."}
                </Text>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
}