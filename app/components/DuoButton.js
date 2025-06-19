import React from 'react';
import { 
  Pressable, 
  Animated, 
  StyleSheet, 
  View 
} from 'react-native';

const DuoButton = ({ 
  onPress, 
  style, 
  children, 
  disabled = false,
  variant = 'primary',
  selected = false
}) => {
  const animation = new Animated.Value(0);

  const handlePressIn = () => {
    if (disabled) return;
    Animated.spring(animation, {
      toValue: 1,
      tension: 400,
      friction: 20,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    if (disabled) return;
    Animated.spring(animation, {
      toValue: 0,
      tension: 400,
      friction: 20,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (disabled) return;
    onPress?.();
  };

  const getButtonColors = () => {
    if (selected) {
      return {
        background: '#e5f0f9',
        border: '#1cb0f6',
      };
    }

    switch (variant) {
      case 'primary':
        return {
          background: '#58cc02',
          border: '#58a700',
        };
      case 'secondary':
        return {
          background: '#1cb0f6',
          border: '#1899d6',
        };
      case 'social':
        return {
          background: '#ffffff',
          border: '#e5e5e5',
        };
      default:
        return {
          background: '#58cc02',
          border: '#58a700',
        };
    }
  };

  const colors = getButtonColors();

  const animatedStyles = {
    transform: [
      {
        translateY: animation.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 4]
        })
      }
    ]
  };

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.buttonContainer, style]}
    >
      <View style={[
        styles.buttonBottom,
        { backgroundColor: colors.border }
      ]} />
      <Animated.View
        style={[
          styles.buttonTop,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,

          },
          animatedStyles,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    position: 'relative',
    width: '100%',
    height: 50,
  },
  buttonBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 4,
    bottom: 0,
    borderRadius: 16,
  },
  buttonTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 4,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default DuoButton; 