import { SimplePerformance } from './simplePerformance';
import { MemoryMonitor } from './memoryMonitor';
import { Share, Platform } from 'react-native';
import RNFS from 'react-native-fs'; // You'll need to install this package

/**
 * Utility for exporting performance data for analysis
 */
export const PerformanceExporter = {
  /**
   * Export current performance data to a shareable format
   */
  async exportData(): Promise<void> {
    try {
      // Collect all performance data
      const data = {
        traces: SimplePerformance.getCompletedTraces(),
        logs: SimplePerformance.getHistory(),
        categories: SimplePerformance.getCategoryStats(),
        violations: SimplePerformance.getBudgetViolations(),
        traceStats: SimplePerformance.getTraceStats(),
        memorySnapshots: MemoryMonitor.getSnapshots(),
        timestamp: new Date().toISOString(),
        device: {
          os: Platform.OS,
          version: Platform.Version,
          isEmulator: __DEV__
        }
      };
      
      // Convert to JSON string
      const jsonData = JSON.stringify(data, null, 2);
      
      // Share options depend on platform
      if (Platform.OS === 'web') {
        // For web, create a download link
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `performance-data-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }
      
      // For native platforms, use Share API or write to file
      if (RNFS) {
        // Write to a temporary file and share it
        const path = `${RNFS.CachesDirectoryPath}/performance-data-${Date.now()}.json`;
        await RNFS.writeFile(path, jsonData, 'utf8');
        
        Share.share({
          title: 'Performance Data Export',
          message: 'App Performance Data',
          url: Platform.OS === 'ios' ? path : `file://${path}`
        });
      } else {
        // Fallback to direct share
        Share.share({
          title: 'Performance Data Export',
          message: jsonData
        });
      }
    } catch (error) {
      console.error('Failed to export performance data:', error);
      SimplePerformance.logEvent('export', `Error exporting data: ${error.message}`, undefined, true);
    }
  }
};