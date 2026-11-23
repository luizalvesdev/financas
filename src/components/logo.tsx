import { View } from 'react-native';

// Same mark as assets/images/logo.svg: an "F" drawn as a horizontal bar chart, plus a coin.
// Coordinates are fractions of the 1024 canvas used by the SVG.
const BG = '#33479E';
const COIN = '#F3C062';
const u = (n: number) => n / 1024;

export function Logo({ size = 56 }: { size?: number }) {
  const bar = (left: number, top: number, width: number, height: number) => ({
    position: 'absolute' as const,
    left: u(left) * size,
    top: u(top) * size,
    width: u(width) * size,
    height: u(height) * size,
    borderRadius: u(60) * size,
    backgroundColor: '#FFFFFF',
  });
  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="Finanças"
      style={{ width: size, height: size, borderRadius: size * 0.225, backgroundColor: BG, overflow: 'hidden' }}>
      <View style={bar(302, 262, 120, 500)} />
      <View style={bar(302, 262, 420, 120)} />
      <View style={bar(302, 462, 260, 120)} />
      <View style={{ ...bar(602, 462, 120, 120), backgroundColor: COIN }} />
    </View>
  );
}
