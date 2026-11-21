import { PORTFOLIO_ENDPOINTS } from '@/portfolio';
import { remotePortfolio } from '@/portfolio/remote';

const fetchMock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock;
});

const respond = (body: unknown, status = 200) =>
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }),
  );

const requestedPath = () => new URL(fetchMock.mock.calls[0][0] as string).pathname;
const requestedUrl = () => new URL(fetchMock.mock.calls[0][0] as string);

describe('remote portfolio (BACKEND=api)', () => {
  it('gets the summary from the summary endpoint', async () => {
    const summary = {
      cash: 1,
      invested: 2,
      total: 3,
      cost: 2,
      unrealized: 0,
      realized: 0,
      lifetimeGain: 0,
    };
    respond(summary);
    await expect(remotePortfolio.getSummary()).resolves.toEqual(summary);
    expect(requestedPath()).toBe(PORTFOLIO_ENDPOINTS.summary);
  });

  it('asks for sold-out holdings only when requested', async () => {
    respond([]);
    await remotePortfolio.getHoldings();
    expect(requestedUrl().pathname).toBe('/api/portfolio/holdings');
    expect(requestedUrl().search).toBe('');

    fetchMock.mockClear();
    respond([]);
    await remotePortfolio.getHoldings({ includeSold: true });
    expect(requestedUrl().search).toBe('?includeSold=true');
  });

  it('gets one holding by asset id', async () => {
    respond({ asset: 3, qty: 2 });
    await expect(remotePortfolio.getHolding(3)).resolves.toMatchObject({ asset: 3, qty: 2 });
    expect(requestedPath()).toBe('/api/portfolio/holdings/3');
  });

  it('passes on an error from the backend', async () => {
    fetchMock.mockResolvedValueOnce(new Response('nope', { status: 500 }));
    await expect(remotePortfolio.getSummary()).rejects.toMatchObject({ status: 500 });
  });
});
