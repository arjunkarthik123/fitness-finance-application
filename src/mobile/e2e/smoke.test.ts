import { by, device, element, expect } from 'detox';

describe('Smoke', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  it('opens on the Activity tab', async () => {
    await expect(element(by.id('activity-screen'))).toBeVisible();
  });
});
