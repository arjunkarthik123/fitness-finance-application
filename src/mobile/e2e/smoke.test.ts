import { by, device, element, expect } from 'detox';

describe('Smoke', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('opens on the login screen', async () => {
    await expect(element(by.text('Log In')).atIndex(0)).toBeVisible();
  });
});
