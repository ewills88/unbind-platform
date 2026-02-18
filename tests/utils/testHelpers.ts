import { userFactory, firmFactory } from '../factories';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TestUser = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TestFirm = any;

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

export const createTestClient = {
  createUser: async (params: { email: string; password: string }): Promise<TestUser> => {
    const response = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: params.email,
        password: params.password,
        full_name: 'Test User',
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data.user;
    }

    // Fallback to factory for unit testing
    return userFactory.build({ email: params.email });
  },

  createAuthenticatedFirm: async (): Promise<{
    token: string;
    firm: TestFirm;
    user: TestUser;
  }> => {
    const user = userFactory.build();
    const firm = firmFactory.build();

    return {
      token: 'mock-jwt-token',
      firm,
      user,
    };
  },
};

export async function authenticatedFetch(
  path: string,
  options: {
    method: string;
    token: string;
    body?: string;
  }
): Promise<Response> {
  return fetch(`${BASE_URL}${path}`, {
    method: options.method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${options.token}`,
    },
    body: options.body,
  });
}

export async function cleanupTestData(_id: string): Promise<void> {
  // In test environments, cleanup is handled by test database teardown
  // This is a no-op for mock-based testing
}
