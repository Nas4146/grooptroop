import React from 'react';
import { View, Text } from 'react-native';
import tw from '../../utils/tw';
import { formatMessageDate } from '../../utils/dateUtils';

interface DateSeparatorProps {
  date: Date;
}

// Memoize the DateSeparator to prevent unnecessary re-renders
const DateSeparator = React.memo(({ date }: DateSeparatorProps) => {
  // Format the date for display
  const formattedDate = formatMessageDate(date);
  
  return (
    <View style={tw`flex-row justify-center my-3 px-4`}>
      <View style={tw`bg-gray-100 py-1.5 px-4 rounded-full`}>
        <Text style={tw`text-gray-500 text-xs font-medium`}>
          {formattedDate}
        </Text>
      </View>
    </View>
  );
});

DateSeparator.displayName = 'DateSeparator';

export default DateSeparator;