import { SimplePerformance } from './simplePerformance';
import { Image } from 'react-native';

/**
 * Monitor asset loading performance (images, fonts, etc.)
 */
export class AssetPerformance {
  // Track image loads
  static imageLoads: Record<string, {
    uri: string,
    startTime: number,
    endTime?: number,
    success: boolean,
    size?: { width: number, height: number }
  }> = {};
  
  /**
   * Create a monitored version of Image
   */
  static MonitoredImage = (props) => {
    const { source, onLoad, onError, ...otherProps } = props;
    const uri = typeof source === 'number' ? 'local-asset' : source?.uri;
    
    // Don't track if no URI
    if (!uri) {
      return <Image source={source} onLoad={onLoad} onError={onError} {...otherProps} />;
    }
    
    // Generate unique ID for this image load
    const imageId = `img_${uri}_${Date.now()}`;
    
    // Start tracking
    AssetPerformance.imageLoads[imageId] = {
      uri,
      startTime: Date.now(),
      success: false
    };
    
    const handleLoad = (event) => {
      // Update tracking info
      AssetPerformance.imageLoads[imageId].endTime = Date.now();
      AssetPerformance.imageLoads[imageId].success = true;
      AssetPerformance.imageLoads[imageId].size = event.nativeEvent.source;
      
      const duration = AssetPerformance.imageLoads[imageId].endTime - 
                       AssetPerformance.imageLoads[imageId].startTime;
                       
      SimplePerformance.logEvent('asset', `Image loaded: ${uri} (${duration}ms)`);
      
      // Call original handler
      onLoad && onLoad(event);
    };
    
    const handleError = (error) => {
      // Update tracking info
      AssetPerformance.imageLoads[imageId].endTime = Date.now();
      AssetPerformance.imageLoads[imageId].success = false;
      
      const duration = AssetPerformance.imageLoads[imageId].endTime - 
                       AssetPerformance.imageLoads[imageId].startTime;
      
      SimplePerformance.logEvent('asset', `Image failed to load: ${uri} (${duration}ms)`, undefined, true);
      
      // Call original handler
      onError && onError(error);
    };
    
    return (
      <Image 
        source={source} 
        onLoad={handleLoad} 
        onError={handleError} 
        {...otherProps} 
      />
    );
  };
  
  /**
   * Get image loading stats
   */
  static getImageStats() {
    const images = Object.values(this.imageLoads);
    const completed = images.filter(img => img.endTime);
    
    const totalTime = completed.reduce((sum, img) => 
      sum + ((img.endTime || 0) - img.startTime), 0);
    
    const successCount = completed.filter(img => img.success).length;
    const failCount = completed.filter(img => !img.success).length;
    
    return {
      totalImages: images.length,
      completedImages: completed.length,
      successRate: completed.length > 0 ? (successCount / completed.length) * 100 : 100,
      averageLoadTime: completed.length > 0 ? totalTime / completed.length : 0,
      failedImages: failCount
    };
  }
}