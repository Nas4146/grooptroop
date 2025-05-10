import React from 'react';
import { View, Text } from 'react-native';
import tw from '../../utils/tw';

type DateSeparatorProps = {
  date: Date;
};

const formatDate = (date: Date): string => {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === today.toDateString()) {
    return 'Today';
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Yesterday';
  } else {
    // For older dates, show the full date with year only if different from current year
    const showYear = date.getFullYear() !== today.getFullYear();
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: showYear ? 'numeric' : undefined
    });
  }
};

const DateSeparator = ({ date }: DateSeparatorProps) => {
  return (
    <View style={tw`flex-row items-center my-2.5`}>
      <View style={tw`flex-1 h-[1px] bg-gray-200 dark:bg-gray-700`} />
      <Text style={tw`mx-2 text-xs text-gray-500 font-medium`}>
        {formatDate(date)}
      </Text>
      <View style={tw`flex-1 h-[1px] bg-gray-200 dark:bg-gray-700`} />
    </View>
  );
};

export default DateSeparator;