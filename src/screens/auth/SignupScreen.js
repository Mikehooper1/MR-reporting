import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { TextInput, Button, Title, Text } from 'react-native-paper';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { createUserProfile } from '../../services/auth';

const SignupScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    employeeCode: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState('');

  useEffect(() => {
    // Generate employee code when the component mounts
    generateEmployeeCode();
  }, []);

  const generateEmployeeCode = () => {
    // Get current date in YYMMDD format
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2); // Last 2 digits of year
    const month = (now.getMonth() + 1).toString().padStart(2, '0'); // Month with leading zero
    const day = now.getDate().toString().padStart(2, '0'); // Day with leading zero
    
    // Generate 3 random digits
    const randomDigits = Math.floor(Math.random() * 900 + 100).toString(); // Random 3-digit number (100-999)
    
    // Create employee code in format SHV + 211124 + XXX (3 random digits)
    const employeeCode = `SHV211124${randomDigits}`;
    
    setFormData(prevData => ({ ...prevData, employeeCode }));
  };

  const handleSignup = async () => {
    if (!formData.email || !formData.password || !formData.confirmPassword || !formData.fullName) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      await createUserProfile(userCredential.user.uid, {
        fullName: formData.fullName,
        employeeCode: formData.employeeCode,
        phone: formData.phone,
        email: formData.email,
        role: 'user',
      });

      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        employeeCode: '',
        phone: '',
      });
      
      // Navigate back to the login screen
      navigation.goBack();
      // Or if you need to reset the navigation stack to the login screen:
      // navigation.reset({
      //   index: 0,
      //   routes: [{ name: 'LoginScreen' }],
      // });

    } catch (error) {
      console.error('Signup error:', error);
      if (error.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please use a different email.');
      } else if (error.code === 'auth/weak-password') {
        setError('Password is too weak. Please use a stronger password.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Invalid email address. Please check your email.');
      } else if (error.message.includes('Permission denied')) {
        setError('Unable to create profile. Please try again later.');
      } else {
        setError(error.message || 'Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Title style={styles.title}>Create Account</Title>

        <TextInput
          label="Full Name"
          value={formData.fullName}
          onChangeText={(text) => setFormData({ ...formData, fullName: text })}
          mode="outlined"
          style={[styles.input, styles.inputText]}
          outlineColor="#000"
          activeOutlineColor="#000"
          textColor="#000"
          theme={{
            colors: {
              primary: '#18fdf6',
              onSurfaceVariant: '#000',
            },
          }}
          onFocus={() => setFocusedField('fullName')}
          onBlur={() => setFocusedField('')}
        />

        <TextInput
          label="Email"
          value={formData.email}
          onChangeText={(text) => setFormData({ ...formData, email: text })}
          mode="outlined"
          style={[styles.input, styles.inputText]}
          keyboardType="email-address"
          autoCapitalize="none"
          outlineColor="#000"
          activeOutlineColor="#000"
          textColor="#000"
          theme={{
            colors: {
              primary: '#18fdf6',
              onSurfaceVariant: '#000',
            },
          }}
          onFocus={() => setFocusedField('email')}
          onBlur={() => setFocusedField('')}
        />

        <TextInput
          label="Password"
          value={formData.password}
          onChangeText={(text) => setFormData({ ...formData, password: text })}
          mode="outlined"
          style={[styles.input, styles.inputText]}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          outlineColor="#000"
          activeOutlineColor="#000"
          textColor="#000"
          theme={{
            colors: {
              primary: '#18fdf6',
              onSurfaceVariant: '#000',
            },
          }}
          onFocus={() => setFocusedField('password')}
          onBlur={() => setFocusedField('')}
          right={
            <TextInput.Icon
              icon={showPassword ? "eye-off" : "eye"}
              onPress={() => setShowPassword(!showPassword)}
              color="#666"
            />
          }
        />

        <TextInput
          label="Confirm Password"
          value={formData.confirmPassword}
          onChangeText={(text) => setFormData({ ...formData, confirmPassword: text })}
          mode="outlined"
          style={[styles.input, styles.inputText]}
          secureTextEntry={!showConfirmPassword}
          autoCapitalize="none"
          outlineColor="#000"
          activeOutlineColor="#000"
          textColor="#000"
          theme={{
            colors: {
              primary: '#18fdf6',
              onSurfaceVariant: '#000',
            },
          }}
          onFocus={() => setFocusedField('confirmPassword')}
          onBlur={() => setFocusedField('')}
          right={
            <TextInput.Icon
              icon={showConfirmPassword ? "eye-off" : "eye"}
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              color="#666"
            />
          }
        />

        <View style={styles.employeeCodeContainer}>
          <TextInput
            label="Employee Code (Auto-generated)"
            value={formData.employeeCode}
            mode="outlined"
            editable={false}
            selectTextOnFocus={false}
            style={[styles.input, { marginBottom: 0, flex: 1 }]}
            outlineColor="#000"
            activeOutlineColor="#000"
            right={
              <TextInput.Icon
                icon="information"
                color="#666"
                tooltip="Employee code is automatically generated"
              />
            }
          />
          {/* <Button 
            mode="outlined" 
            onPress={generateEmployeeCode}
            style={styles.regenerateButton}
            labelStyle={{ color: '#18fdf6' }}
          >
            Regenerate
          </Button> */}
        </View>

        <TextInput
          label="Phone Number"
          value={formData.phone}
          onChangeText={(text) => setFormData({ ...formData, phone: text })}
          mode="outlined"
          style={[styles.input, styles.inputText]}
          keyboardType="phone-pad"
          outlineColor="#000"
          activeOutlineColor="#000"
          textColor="#000"
          theme={{
            colors: {
              primary: '#18fdf6',
              onSurfaceVariant: '#000',
            },
          }}
          onFocus={() => setFocusedField('phone')}
          onBlur={() => setFocusedField('')}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          mode="contained"
          onPress={handleSignup}
          loading={loading}
          style={styles.button}
          disabled={loading}
        >
          <Text style={styles.loginText}>Sign Up</Text>
        </Button>

        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <Button
            mode="text"
            onPress={() => navigation.goBack()}
            disabled={loading}
            style={styles.loginButton}
          >
           <Text style={styles.loginTextButton}>Login</Text> 
          </Button>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF671F',
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  inputText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  button: {
    marginTop: 24,
    paddingVertical: 8,
    backgroundColor: '#18fdf6',
  },
  error: {
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  loginText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  loginButton: {
    marginLeft: -8,
  },
  loginTextButton: {
    fontSize: 18,
    color: '#18fdf6',
    fontWeight: 'bold',
  },
  employeeCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  regenerateButton: {
    marginLeft: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderColor: '#fff',
  },
});

export default SignupScreen; 