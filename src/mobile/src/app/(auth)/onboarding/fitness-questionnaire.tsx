import { WireframeScreen } from '@/components/WireframeScreen';

export default function FitnessQuestionnaireScreen() {
  return (
    <WireframeScreen
      title="Fitness Questionnaire"
      purpose="Learn the user's activity level and fitness goals."
      todos={['Activity level', 'Fitness goals', 'Connect a fitness device (optional)']}
      links={[{ label: 'Finish and enter app', href: '/dashboard' }]}
    />
  );
}
