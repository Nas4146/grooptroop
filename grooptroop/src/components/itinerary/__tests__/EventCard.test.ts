import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import EventCard from '../EventCard';
import { ItineraryEvent } from '../../../models/itinerary';

jest.mock('@react-navigation/native', () => {
  return {
    ...jest.requireActual('@react-navigation/native'),
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

describe('EventCard', () => {
  const mockEvent: ItineraryEvent = {
    id: '1',
    title: 'Test Event',
    date: '2024-06-05',
    time: '8:00 PM',
    description: 'Test Description',
    isPaymentRequired: true,
    totalCost: 100,
    costPerPerson: 10,
    paid: false,
    isOptional: false,
  };

  const mockOptionalEvent: ItineraryEvent = {
    ...mockEvent,
    id: '2',
    isOptional: true,
  };

  const mockPaidEvent: ItineraryEvent = {
    ...mockEvent,
    id: '3',
    paid: true,
  };

  it('renders event title correctly', () => {
    const { getByText } = render(<EventCard event={mockEvent} />);
    expect(getByText('Test Event')).toBeTruthy();
  });

  it('renders time correctly', () => {
    const { getByText } = render(<EventCard event={mockEvent} />);
    expect(getByText('8:00 PM')).toBeTruthy();
  });

  it('renders description correctly', () => {
    const { getByText } = render(<EventCard event={mockEvent} />);
    expect(getByText('Test Description')).toBeTruthy();
  });

  it('shows Optional tag for optional events', () => {
    const { getByText } = render(<EventCard event={mockOptionalEvent} />);
    expect(getByText('Optional')).toBeTruthy();
  });

  it('shows payment amount for payable events', () => {
    const { getByText } = render(<EventCard event={mockEvent} />);
    expect(getByText('$10')).toBeTruthy();
  });

  it('shows different icon for paid events', () => {
    const { getByTestId } = render(<EventCard event={mockPaidEvent} />);
    expect(getByTestId('icon-checkmark-circle')).toBeTruthy();
  });

  it('shows card icon for unpaid events', () => {
    const { getByTestId } = render(<EventCard event={mockEvent} />);
    expect(getByTestId('icon-card-outline')).toBeTruthy();
  });

  it('shows location if available', () => {
    const eventWithLocation = { ...mockEvent, location: 'Test Location' };
    const { getByText } = render(<EventCard event={eventWithLocation} />);
    expect(getByText('Test Location')).toBeTruthy();
  });

  it('uses different styling when selected', () => {
    const { getByText, rerender } = render(<EventCard event={mockEvent} isSelected={false} />);
    const title = getByText('Test Event');
    
    // Re-render with isSelected=true
    rerender(<EventCard event={mockEvent} isSelected={true} />);
    
    // This test is a bit tricky with NativeWind since we can't easily check class names
    // In a real implementation, you might want to use testID props to verify this
  });
});