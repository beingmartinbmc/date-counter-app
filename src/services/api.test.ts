export {};

// Guards the one branch that fails silently: an absent key must omit the header
// entirely rather than send "X-API-Key: undefined".
function loadApiWithKey(key?: string) {
  jest.resetModules();
  if (key === undefined) {
    delete process.env.REACT_APP_API_KEY;
  } else {
    process.env.REACT_APP_API_KEY = key;
  }
  return require('./api');
}

function mockFetch() {
  const fetchMock = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ success: true, data: [], pagination: {} }),
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

const originalKey = process.env.REACT_APP_API_KEY;

afterEach(() => {
  if (originalKey === undefined) {
    delete process.env.REACT_APP_API_KEY;
  } else {
    process.env.REACT_APP_API_KEY = originalKey;
  }
});

test('sends X-API-Key when the key is configured', async () => {
  const fetchMock = mockFetch();
  const { eventsApi } = loadApiWithKey('test-key');

  await eventsApi.getAll();

  expect(fetchMock.mock.calls[0][1].headers['X-API-Key']).toBe('test-key');
});

test('omits X-API-Key entirely when the key is absent', async () => {
  const fetchMock = mockFetch();
  const { eventsApi } = loadApiWithKey(undefined);

  await eventsApi.getAll();

  expect('X-API-Key' in fetchMock.mock.calls[0][1].headers).toBe(false);
});

test('preserves per-call headers alongside the key', async () => {
  const fetchMock = mockFetch();
  const { eventsApi } = loadApiWithKey('test-key');

  await eventsApi.create({ title: 'x', eventDate: '2026-01-01' });

  expect(fetchMock.mock.calls[0][1].headers).toEqual({
    'Content-Type': 'application/json',
    'X-API-Key': 'test-key',
  });
});
