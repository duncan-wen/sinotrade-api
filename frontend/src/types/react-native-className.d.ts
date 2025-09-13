// 擴展 React Native 組件以支援 className（NativeWind）
declare module 'react-native' {
  interface ViewProps {
    className?: string;
  }

  interface TextProps {
    className?: string;
  }

  interface TouchableOpacityProps {
    className?: string;
  }

  interface PressableProps {
    className?: string;
  }

  interface ScrollViewProps {
    className?: string;
  }

  interface ImageProps {
    className?: string;
  }
}
