// 強制 TypeScript 將 react-native 映射到 react-native-web
declare module 'react-native' {
  export * from 'react-native-web';
}
