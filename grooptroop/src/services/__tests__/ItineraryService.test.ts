import { ItineraryService } from '../ItineraryService';

describe('ItineraryService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should return itinerary data', async () => {
    const promise = ItineraryService.getItinerary();
    jest.advanceTimersByTime(1000);
    const data = await promise;
    
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
    
    // Check structure of the first day
    const firstDay = data[0];
    expect(firstDay).toHaveProperty('date');
    expect(firstDay).toHaveProperty('formattedDate');
    expect(firstDay).toHaveProperty('events');
    expect(Array.isArray(firstDay.events)).toBe(true);
  });

  it('should return a specific itinerary day by date', async () => {
    const promise = ItineraryService.getItineraryDay('2024-06-05');
    jest.advanceTimersByTime(1000);
    const day = await promise;
    
    expect(day).toBeDefined();
    expect(day?.date).toBe('2024-06-05');
    expect(day?.formattedDate).toBe('Thursday June 5th');
    expect(Array.isArray(day?.events)).toBe(true);
  });

  it('should return undefined for non-existent itinerary day', async () => {
    const promise = ItineraryService.getItineraryDay('2024-01-01');
    jest.advanceTimersByTime(1000);
    const day = await promise;
    
    expect(day).toBeUndefined();
  });

  it('should call console.log when caching itinerary', async () => {
    const consoleSpy = jest.spyOn(console, 'log');
    await ItineraryService.cacheItinerary([]);
    expect(consoleSpy).toHaveBeenCalledWith('Caching itinerary data...');
    consoleSpy.mockRestore();
  });
});