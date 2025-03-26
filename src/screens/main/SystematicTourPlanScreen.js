import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Card, Title, Text, List } from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import { isSunday, format } from 'date-fns';
import { firestore, auth } from '../../services/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

const SystematicTourPlanScreen = () => {
  const [markedDates, setMarkedDates] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDateDetails, setSelectedDateDetails] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userId = auth.currentUser?.uid;
        if (!userId) {
          console.log('No user ID found');
          return;
        }

        console.log('Fetching data for user:', userId);
        
        // Fetch reports
        const reportsQuery = query(
          collection(firestore, 'reports'),
          where('userId', '==', userId)
        );
        
        const reportsSnapshot = await getDocs(reportsQuery);
        const reports = [];
        reportsSnapshot.forEach((doc) => {
          const data = doc.data();
          console.log('Raw report data:', {
            id: doc.id,
            ...data,
            date: data.createdAt?.toDate?.() || 'No date',
            travelType: data.travelType
          });
          reports.push({ id: doc.id, ...data });
        });

        // Fetch leaves
        const leavesQuery = query(
          collection(firestore, 'leaves'),
          where('userId', '==', userId),
          where('status', '==', 'approved')
        );
        
        const leavesSnapshot = await getDocs(leavesQuery);
        const leaves = [];
        leavesSnapshot.forEach((doc) => {
          const data = doc.data();
          console.log('Raw leave data:', {
            id: doc.id,
            ...data,
            startDate: data.startDate?.toDate?.() || 'No date',
            endDate: data.endDate?.toDate?.() || 'No date'
          });
          leaves.push({ id: doc.id, ...data });
        });

        console.log('Total reports fetched:', reports.length);
        console.log('Total leaves fetched:', leaves.length);

        // Generate marked dates for Sundays, reports, and leaves
        const newMarkedDates = {};
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        
        // Start from January 1st of current year
        let date = new Date(currentYear, 0, 1);
        // End at December 31st of current year
        const endDate = new Date(currentYear, 11, 31);

        while (date <= endDate) {
          const dateString = format(date, 'yyyy-MM-dd');
          const dots = [];
          const details = [];

          // Add red dot for Sundays
          if (isSunday(date)) {
            dots.push({
              key: 'sunday',
              color: 'red'
            });
            details.push({
              type: 'Sunday',
              color: 'red',
              description: 'Weekly off day'
            });
          }

          // Add red dots for leaves
          const leavesForDate = leaves.filter(leave => {
            const startDate = leave.startDate?.toDate?.();
            const endDate = leave.endDate?.toDate?.();
            if (!startDate || !endDate) {
              console.log('Leave missing dates:', leave.id);
              return false;
            }
            return date >= startDate && date <= endDate;
          });

          leavesForDate.forEach(leave => {
            dots.push({
              key: `leave-${leave.id}`,
              color: 'red'
            });
            details.push({
              type: 'Leave',
              color: 'red',
              description: `Leave period: ${format(leave.startDate?.toDate?.(), 'dd MMM yyyy')} to ${format(leave.endDate?.toDate?.(), 'dd MMM yyyy')}`
            });
          });

          // Add dots for reports
          const reportsForDate = reports.filter(report => {
            const reportDate = report.createdAt?.toDate?.();
            if (!reportDate) {
              console.log('Report missing date:', report.id);
              return false;
            }
            const reportDateString = format(reportDate, 'yyyy-MM-dd');
            console.log('Comparing dates:', {
              reportDate: reportDateString,
              currentDate: dateString,
              matches: reportDateString === dateString,
              travelType: report.travelType
            });
            return reportDateString === dateString;
          });

          console.log(`Reports for ${dateString}:`, reportsForDate.map(r => r.travelType));

          reportsForDate.forEach(report => {
            console.log('Processing report:', {
              date: dateString,
              type: report.travelType,
              hasDate: !!report.createdAt
            });
            
            if (report.travelType === 'HQ') {
              dots.push({
                key: `headquarter-${report.id}`,
                color: '#00FF00' // Green
              });
              details.push({
                type: 'Headquarter',
                color: '#00FF00',
                description: `Report submitted for ${report.title || 'Headquarter visit'}`
              });
            } else if (report.travelType === 'INT') {
              dots.push({
                key: `interior-${report.id}`,
                color: '#800080' // Purple
              });
              details.push({
                type: 'Interior',
                color: '#800080',
                description: `Report submitted for ${report.title || 'Interior visit'}`
              });
            }
          });

          // Only add to markedDates if there are dots
          if (dots.length > 0) {
            newMarkedDates[dateString] = {
              marked: true,
              dots,
              details // Store details for each date
            };
          }

          date.setDate(date.getDate() + 1);
        }

        console.log('Final marked dates:', JSON.stringify(newMarkedDates, null, 2));
        setMarkedDates(newMarkedDates);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  const handleDatePress = (day) => {
    setSelectedDate(day);
    const dateDetails = markedDates[day.dateString]?.details || [];
    setSelectedDateDetails(dateDetails);
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title>Tour Plans</Title>
          <View style={styles.legendContainer}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#00FF00' }]} />
              <Title style={styles.legendText}>Headquarter</Title>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#800080' }]} />
              <Title style={styles.legendText}>Interior</Title>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: 'red' }]} />
              <Title style={styles.legendText}>Sunday/Leave (Off)</Title>
            </View>
          </View>
          <Calendar
            markedDates={markedDates}
            markingType="multi-dot"
            style={styles.calendar}
            onDayPress={handleDatePress}
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

      {selectedDate && (
        <Card style={styles.detailsCard}>
          <Card.Content>
            <Title>Details for {format(new Date(selectedDate.timestamp), 'dd MMM yyyy')}</Title>
            {selectedDateDetails.length > 0 ? (
              selectedDateDetails.map((detail, index) => (
                <List.Item
                  key={index}
                  title={detail.type}
                  description={detail.description}
                  left={props => (
                    <View style={[styles.dot, { backgroundColor: detail.color }]} />
                  )}
                />
              ))
            ) : (
              <Text>No activities scheduled for this date</Text>
            )}
          </Card.Content>
        </Card>
      )}
    </ScrollView>
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
    backgroundColor: '#fff',
  },
  detailsCard: {
    margin: 10,
    marginTop: 0,
    elevation: 4,
    backgroundColor: '#fff',
  },
  calendar: {
    marginVertical: 10,
    borderRadius: 10,
  },
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    marginBottom: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 5,
  },
  legendText: {
    fontSize: 12,
    marginLeft: 5,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
});

export default SystematicTourPlanScreen; 