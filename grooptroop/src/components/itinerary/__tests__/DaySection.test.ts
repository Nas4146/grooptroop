import React from 'react';
import { render } from '@testing-library/react-native';
import DaySection from '../DaySection';
import { ItineraryDay } from '../../../models/itinerary';

// Mock the EventCard component
jest.mock('../EventCard', () => {
  return function MockEventCard(props: any) {
    return (
      <div data-testid={`event-card-${props.event.id}`}>
        Event Card: {props.event.title}
      </div>
    );
  };
});

describe('DaySection', () => {
  const mockDay: ItineraryDay = {
    date: '2024-06-05',
    formattedDate: 'Thursday June 5th',
    events: [
      {
        id: '1',
        title: 'Event 1',
        date: '2024-06-05',
        time: '8:00 PM',
        description: 'Description 1',
        isPaymentRequired: false,
        isOptional: false,
      },
      {
        id: '2',
        title: 'Event 2',
        date: '2024-06-05',
        time: '10:00 PM',
        description: 'Description 2',
        isPaymentRequired: true,
        totalCost: 100,
        costPerPerson: 10,
        paid: false,
        isOptional: true,
      },
    ],
  };

  it('renders the formatted date correctly', () => {
    const { getByText } = render(<DaySection day={mockDay} />);
    expect(getByText('Thursday June 5th')).toBeTruthy();
  });

  it('renders an EventCard for each event', () => {
    const { getAllByTestId } = render(<DaySection day={mockDay} />);
    
    // We'd need testID in the actual component for this test to work properly
    // This is just an example of how you would test it
    const eventCards = getAllByTestId(/event-card-/);
    expect(eventCards.length).toBe(2);
  });
});