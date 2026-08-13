import { getAddress } from 'viem'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  FarcasterProviderError,
  lookupFarcasterIdentityByUsername,
  normalizeNeynarUser,
  selectAddressIdentity,
} from './farcasterIdentity'

const primaryAddress = '0x0000000000000000000000000000000000000001'
const secondaryAddress = '0x0000000000000000000000000000000000000002'

const user = {
  fid: 123,
  username: 'builder',
  display_name: 'Builder',
  pfp_url: 'https://example.com/builder.png',
  custody_address: '0x0000000000000000000000000000000000000003',
  verified_addresses: {
    primary: { eth_address: primaryAddress },
    eth_addresses: [primaryAddress, secondaryAddress, secondaryAddress.toUpperCase()],
  },
}

describe('normalizeNeynarUser', () => {
  it('uses verified_addresses.primary.eth_address and deduplicates connected wallets', () => {
    expect(normalizeNeynarUser(user)).toEqual({
      fid: 123,
      username: 'builder',
      displayName: 'Builder',
      pfpUrl: 'https://example.com/builder.png',
      primaryAddress,
      connectedAddresses: [primaryAddress, secondaryAddress],
      profileUrl: 'https://warpcast.com/builder',
    })
  })

  it('rejects a user without a valid primary EVM wallet', () => {
    expect(
      normalizeNeynarUser({
        ...user,
        verified_addresses: {
          ...user.verified_addresses,
          primary: { eth_address: null },
        },
      })
    ).toBeNull()
  })
})

describe('selectAddressIdentity', () => {
  const normalized = normalizeNeynarUser(user)!

  it('selects the only associated Farcaster identity', () => {
    expect(selectAddressIdentity(primaryAddress, [normalized])).toEqual({
      status: 'resolved',
      identity: normalized,
    })
  })

  it('selects a unique identity whose primary wallet matches the address', () => {
    const other = {
      ...normalized,
      fid: 456,
      username: 'other',
      primaryAddress: getAddress(secondaryAddress),
    }
    expect(selectAddressIdentity(primaryAddress, [normalized, other])).toEqual({
      status: 'resolved',
      identity: normalized,
    })
  })

  it('returns ambiguity instead of selecting users[0]', () => {
    const duplicatePrimary = { ...normalized, fid: 456, username: 'other' }
    expect(
      selectAddressIdentity(primaryAddress, [normalized, duplicatePrimary])
    ).toMatchObject({ status: 'ambiguous', identities: [normalized, duplicatePrimary] })
  })
})

describe('Neynar provider boundary', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('fails safely when NEYNAR_API_KEY is missing', async () => {
    vi.stubEnv('NEYNAR_API_KEY', '')
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(lookupFarcasterIdentityByUsername('builder')).rejects.toMatchObject({
      code: 'CONFIGURATION_ERROR',
      status: 503,
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('maps an upstream rate limit without exposing provider response details', async () => {
    vi.stubEnv('NEYNAR_API_KEY', 'test-only-key')
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          new Response('{}', { status: 429, headers: { 'Retry-After': '30' } })
        )
    )

    await expect(lookupFarcasterIdentityByUsername('builder')).rejects.toEqual(
      expect.objectContaining<Partial<FarcasterProviderError>>({
        code: 'RATE_LIMITED',
        status: 429,
        retryAfter: '30',
      })
    )
  })

  it('rejects malformed successful provider responses', async () => {
    vi.stubEnv('NEYNAR_API_KEY', 'test-only-key')
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ user: { username: 'builder' } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    )

    await expect(lookupFarcasterIdentityByUsername('builder')).rejects.toMatchObject({
      code: 'INVALID_PROVIDER_RESPONSE',
      status: 502,
    })
  })
})
