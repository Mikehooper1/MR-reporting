import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { TextInput, Button, Title, Text, IconButton, Checkbox } from 'react-native-paper';
import { loginUser } from '../../services/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Check for saved credentials on component mount
  useEffect(() => {
    checkSavedCredentials();
  }, []);

  const checkSavedCredentials = async () => {
    try {
      const savedEmail = await AsyncStorage.getItem('savedEmail');
      const savedPassword = await AsyncStorage.getItem('savedPassword');
      const rememberMeValue = await AsyncStorage.getItem('rememberMe');
      
      if (savedEmail && savedPassword && rememberMeValue === 'true') {
        setEmail(savedEmail);
        setPassword(savedPassword);
        setRememberMe(true);
        // Auto-login if credentials are saved
        handleLogin();
      }
    } catch (error) {
      console.error('Error checking saved credentials:', error);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await loginUser(email, password);

      // Save credentials if remember me is checked
      if (rememberMe) {
        await AsyncStorage.setItem('savedEmail', email);
        await AsyncStorage.setItem('savedPassword', password);
        await AsyncStorage.setItem('rememberMe', 'true');
      } else {
        // Clear saved credentials if remember me is unchecked
        await AsyncStorage.removeItem('savedEmail');
        await AsyncStorage.removeItem('savedPassword');
        await AsyncStorage.removeItem('rememberMe');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message || 'Failed to login. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
      {/* <Image
          source={require('../../../assets/archery.png')}
          style={styles.logo}
          resizeMode="contain"
        /> */}
        <Title style={styles.title}>SHEELVO</Title>
        <Title style={styles.title}>PHARMACEUTICAL PVT LTD</Title>
        <View style={styles.subtitleContainer}>
          <Image
            source={require('../../../assets/archery.png')}
            style={styles.subtitleIcon}
          />
          <Text style={styles.subtitle}>FPR REPORTING</Text>
        </View>
        <Image
          source={require('../../../assets/logo.gif')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      

      <View style={styles.formContainer}>
        <TextInput
          label="Email"
          value={email}
          onChangeText={setEmail}
          mode="outlined"
          style={[styles.input, styles.inputText]}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          outlineColor="#000"
          activeOutlineColor="#000"
          textColor="#000"
          theme={{
            colors: {
              primary: '#18fdf6',
              onSurfaceVariant: '#000',
            },
          }}
          onFocus={() => setEmailFocused(true)}
          onBlur={() => setEmailFocused(false)}
        />

        <TextInput
          label="Password"
          value={password}
          onChangeText={setPassword}
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
          onFocus={() => setPasswordFocused(true)}
          onBlur={() => setPasswordFocused(false)}
          right={
            <TextInput.Icon
              icon={showPassword ? "eye-off" : "eye"}
              onPress={() => setShowPassword(!showPassword)}
              color="#666"
            />
          }
        />

        <View style={styles.rememberMeContainer}>
          <Checkbox
            status={rememberMe ? 'checked' : 'unchecked'}
            onPress={() => setRememberMe(!rememberMe)}
            color="#18fdf6"
          />
          <Text style={styles.rememberMeText}>Remember Me</Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button 
          mode="contained"
          onPress={handleLogin}
          loading={loading}
          style={styles.button}
          disabled={loading}
        >
          <Text style={styles.loginText}>Login</Text>
        </Button>

        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>Don't have an account? </Text>
          <Button
            mode="text"
            onPress={() => navigation.navigate('Signup')}
            disabled={loading}
            style={styles.signupButton}
          >
            <Text style={styles.signupTextButton}>Sign Up</Text>
          </Button>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FF671F',
  },
  logoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: 200,
    height: 100,
    marginTop: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    alignContent: 'center',
    textAlign: 'center',
  },
  subtitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  subtitleIcon: {
    width: 50,
    height: 50,
    marginRight: 8,
  },
  subtitle: {
    fontSize: 22,
    color: '#fff',
    fontWeight: 'bold',
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'flex-start',
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
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  signupButton: {
    marginLeft: -8,
    color: '#FF671F',
    fontSize: 19,
    fontWeight: 'bold',
  },
  loginText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  signupText: {
    fontSize: 19,
    // fontWeight: 'bold',
    color: '#fff',
  },
  signupTextButton: {
    fontSize: 19,
    
    color: '#18fdf6',

  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  rememberMeText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 8,
  },
});

export default LoginScreen; 