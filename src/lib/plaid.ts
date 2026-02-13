import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

const configuredEnv = (process.env.PLAID_ENV || 'production').toLowerCase();
const PLAID_ENV = (configuredEnv in PlaidEnvironments
  ? configuredEnv
  : 'production') as keyof typeof PlaidEnvironments;

const plaidClientId = process.env.PLAID_CLIENT_ID;
const plaidSecret = process.env.PLAID_SECRET;

if (!plaidClientId || !plaidSecret) {
  console.warn('Plaid credentials are not configured. Plaid routes will fail until PLAID_CLIENT_ID and PLAID_SECRET are set.');
}

const configuration = new Configuration({
  basePath: PlaidEnvironments[PLAID_ENV],
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': plaidClientId || '',
      'PLAID-SECRET': plaidSecret || '',
      'Plaid-Version': '2020-09-14', // Use stable API version
    },
  },
});

export const plaidClient = new PlaidApi(configuration);
export const PLAID_ENVIRONMENT = PLAID_ENV;
