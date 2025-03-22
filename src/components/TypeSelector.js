import React from 'react';
import { View } from 'react-native';
import { Button, Menu, Portal } from 'react-native-paper';

export const REPORT_TYPES = [
  'Daily Call Report',
  'Weekly Summary',
  'Monthly Review',
  'Special Event',
  'Training Report'
];

export const EXPENSE_TYPES = [
  'Travel',
  'Accommodation',
  'Meals',
  // 'Entertainment',
  // 'Office Supplies',
  // 'Medical Samples',
   'Other'
];

export const TOUR_PLAN_TYPES = [
  'Regular Visit',
  'Special Campaign',
  'Product Launch',
  'Training Session',
  'Market Survey',
  'Conference'
];

export const ORDER_TYPES = [
  'Regular Order',
  'Emergency Order',
  'Sample Order',
  'Bulk Order',
  'Special Request'
];

export const UTILITY_TYPES = [
  'Bag',
  'Visiting Card',
  'Other'
];

export const VISUAL_AID_TYPES = [
  'Product Presentation',
  'Clinical Data',
  'Marketing Material',
  'Training Material',
  'Digital Content',
  'Print Material'
];

export const PRIORITY_TYPES = [
  'High',
  'Medium',
  'Low'
];

export const DOCTOR_SPECIALITIES = [
  'General Physician',
  'Gynecologist',
  'Cardiologist',
  'Neurologist',
  'Pediatrician',
  'Dermatologist',
  'Psychiatrist',
  'Orthopedic',
  'ENT Specialist',
  'Other'
];

const TypeSelector = ({ 
  visible, 
  onDismiss, 
  onSelect, 
  types, 
  selectedType,
  label = "Select Type" 
}) => {
  const [buttonLayout, setButtonLayout] = React.useState({ x: 0, y: 0, width: 0, height: 0 });
  const buttonRef = React.useRef();

  const measureButton = () => {
    buttonRef.current?.measureInWindow((x, y, width, height) => {
      setButtonLayout({ x, y, width, height });
    });
  };

  return (
    <View>
      <Button
        ref={buttonRef}
        mode="outlined"
        onPress={() => {
          measureButton();
          onDismiss();
        }}
        style={{ marginBottom: 16 }}
      >
        {selectedType || label}
      </Button>
      <Portal>
        <Menu
          visible={visible}
          onDismiss={onDismiss}
          anchor={{ x: buttonLayout.x, y: buttonLayout.y }}
          style={{ width: buttonLayout.width }}
        >
          {types.map((type) => (
            <Menu.Item
              key={type}
              onPress={() => {
                onSelect(type);
                onDismiss();
              }}
              title={type}
            />
          ))}
        </Menu>
      </Portal>
    </View>
  );
};

export default TypeSelector; 