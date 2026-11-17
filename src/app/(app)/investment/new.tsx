import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ui';
import { NewInvestment } from '@/features/editors';
import { useColors } from '@/lib/theme';

export default function NewInvestmentScreen() {
  const c = useColors();
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: c.bg }}>
      <NewInvestment
        layout="screen"
        header={<ScreenHeader title="Novo investimento" onBack={() => router.back()} />}
        onDone={() => router.back()}
      />
    </SafeAreaView>
  );
}
