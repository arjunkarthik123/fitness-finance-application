import { WireframeScreen } from '@/components/WireframeScreen';

export default function FinanceQuestionnaireScreen() {
  return (
    <WireframeScreen
      title="Finance Questionnaire"
      purpose="Learn the user's investing experience and financial goals."
      todos={['Experience level', 'Financial goals', 'Risk tolerance']}
      links={[{ label: 'Next', href: '/onboarding/fitness-questionnaire' }]}
    />
  );
}
