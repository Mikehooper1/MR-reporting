import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Title } from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import { isSunday, format } from 'date-fns';

const STPScreen = () => {
  const [markedDates, setMarkedDates] = useState({});

  useEffect(() => {
    console.log('Generating marked dates for Sundays...');
    const generateMarkedDates = () => {
      const newMarkedDates = {};
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      
      // Start from January 1st of current year
      let date = new Date(currentYear, 0, 1);
      // End at December 31st of current year
      const endDate = new Date(currentYear, 11, 31);

      while (date <= endDate) {
        if (isSunday(date)) {
          const dateString = format(date, 'yyyy-MM-dd');
          console.log('Marking Sunday:', dateString);
          newMarkedDates[dateString] = {
            marked: true,
            dots: [{
              key: 'sunday',
              color: 'red'
            }]
          };
        }
        date.setDate(date.getDate() + 1);
      }

      console.log('Final marked dates:', newMarkedDates);
      setMarkedDates(newMarkedDates);
    };

    generateMarkedDates();
  }, []);

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>Tour Plans</Title>
          <Calendar
            markedDates={markedDates}
            markingType="multi-dot"
            style={styles.calendar}
            onDayPress={(day) => {
              console.log('Selected day:', day);
            }}
            theme={{
              backgroundColor: '#ffffff',
              calendarBackground: '#ffffff',
              textSectionTitleColor: '#b6c1cd',
              selectedDayBackgroundColor: '#2196F3',
              selectedDayTextColor: '#ffffff',
              todayTextColor: '#2196F3',
              dayTextColor: '#2d4150',
              textDisabledColor: '#d9e1e8',
              dotColor: '#00adf5',
              selectedDotColor: '#ffffff',
              arrowColor: '#2196F3',
              monthTextColor: '#2d4150',
              indicatorColor: '#2196F3',
              textDayFontFamily: 'System',
              textMonthFontFamily: 'System',
              textDayHeaderFontFamily: 'System',
              textDayFontWeight: '300',
              textMonthFontWeight: 'bold',
              textDayHeaderFontWeight: '300'
            }}
            enableSwipeMonths={true}
            showWeekNumbers={false}
            displayLoadingIndicator={false}
          />
        </Card.Content>
      </Card>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  card: {
    margin: 10,
    elevation: 4,
  },
  calendar: {
    marginVertical: 10,
    borderRadius: 10,
  },
});

export default STPScreen;
