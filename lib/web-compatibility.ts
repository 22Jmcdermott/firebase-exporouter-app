import { Platform } from 'react-native';

/**
 * Web compatibility utilities for React Native components
 */

export const isWeb = Platform.OS === 'web';

// Web-safe alert for better UX on web
export const webAlert = (title: string, message?: string, buttons?: any[]) => {
  if (isWeb) {
    const fullMessage = message ? `${title}\n\n${message}` : title;
    
    if (buttons && buttons.length > 0) {
      const result = window.confirm(fullMessage);
      const callback = buttons.find(btn => 
        btn.style === 'destructive' || 
        btn.text?.toLowerCase().includes('ok') ||
        btn.text?.toLowerCase().includes('yes')
      )?.onPress;
      
      if (result && callback) {
        callback();
      }
    } else {
      window.alert(fullMessage);
    }
  } else {
    // Use React Native Alert for mobile
    const { Alert } = require('react-native');
    Alert.alert(title, message, buttons);
  }
};

// Web-safe ActivityIndicator alternative
export const getWebSpinner = () => {
  if (isWeb) {
    return {
      component: 'div',
      style: {
        width: '20px',
        height: '20px',
        border: '2px solid #f3f3f3',
        borderTop: '2px solid #3498db',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }
    };
  }
  
  const { ActivityIndicator } = require('react-native');
  return { component: ActivityIndicator };
};

// Inject CSS animation for web spinner
if (isWeb && typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}