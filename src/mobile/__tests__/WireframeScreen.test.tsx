import { render, screen } from '@testing-library/react-native';

import { WireframeScreen } from '@/components/WireframeScreen';

describe('WireframeScreen', () => {
  it('renders the title, purpose, todos, and links', async () => {
    await render(
      <WireframeScreen
        title="Log In"
        purpose="Log in to an existing account."
        todos={['Username field']}
        links={[{ label: 'Register new account', href: '/register' }]}
      />,
    );

    expect(screen.getByText('Log In')).toBeOnTheScreen();
    expect(screen.getByText('Log in to an existing account.')).toBeOnTheScreen();
    expect(screen.getByText('• Username field')).toBeOnTheScreen();
    expect(screen.getByRole('link', { name: 'Register new account' })).toBeOnTheScreen();
  });
});
