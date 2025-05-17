import { useRef, useEffect } from 'react';
import { useNavigation } from '@react-navigation/native';
import { SimplePerformance } from './simplePerformance';

/**
 * Hook to track navigation performance
 * It automatically measures screen transitions and reports analytics
 */
export function useNavigationPerformance() {
  const navigation = useNavigation();
  const lastNavAction = useRef<{ 
    time: number, 
    targetScreen: string,
    traceId: string | null 
  } | null>(null);
  
  useEffect(() => {
    // Track when navigation is dispatched
    const unsubscribeBeforeRemove = navigation.addListener('beforeRemove', (e) => {
      const { target } = e.data.action;
      
      if (target) {
        // Store navigation start time and target
        lastNavAction.current = {
          time: Date.now(),
          targetScreen: target.split('-')[0],
          traceId: SimplePerformance.startTrace(
            `nav_to_${target.split('-')[0]}`, 
            { targetScreen: target }, 
            'screen-transition'
          )
        };
      }
    });
    
    return unsubscribeBeforeRemove;
  }, [navigation]);
  
  useEffect(() => {
    // Track when navigation state is updated (screen is fully rendered)
    const unsubscribeStateChange = navigation.addListener('state', (e) => {
      // If we were tracking a navigation action
      if (lastNavAction.current?.traceId) {
        const { time, targetScreen, traceId } = lastNavAction.current;
        
        // End the trace for this navigation
        SimplePerformance.endTrace(traceId);
        
        // Calculate the total transition time
        const transitionTime = Date.now() - time;
        
        // Log the transition completed
        SimplePerformance.logEvent(
          'navigation',
          `Completed transition to ${targetScreen} in ${transitionTime}ms`
        );
        
        // Reset tracking
        lastNavAction.current = null;
      }
    });
    
    return unsubscribeStateChange;
  }, [navigation]);
  
  // Manually track screen render
  const trackScreenRender = (screenName: string) => {
    return SimplePerformance.startTrace(
      `render_${screenName}`,
      { screen: screenName },
      'render'
    );
  };
  
  return {
    trackScreenRender,
  };
}