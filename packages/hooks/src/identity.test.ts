import { describe, expect, it, vi } from 'vitest'

import {
  freezeResolvedIdentityTarget,
  normalizeFarcasterUsername,
  resolveIdentityInput,
  selectPreferredIdentity,
} from './identity'

const address = '0x0000000000000000000000000000000000000001' as const
const otherAddress = '0x0000000000000000000000000000000000000002' as const

const farcasterIdentity = {
  fid: 123,
  username: 'builder',
  displayName: 'Builder',
  pfpUrl: 'https://example.com/builder.png',
  primaryAddress: otherAddress,
  connectedAddresses: [otherAddress, address],
  profileUrl: 'https://warpcast.com/builder',
} as const

describe('identity helpers', () => {
  it('normalizes Farcaster usernames with or without @', () => {
    expect(normalizeFarcasterUsername('@Builder')).toBe('builder')
    expect(normalizeFarcasterUsername('builder')).toBe('builder')
  })

  it('rejects malformed Farcaster usernames', () => {
    expect(normalizeFarcasterUsername('bad handle')).toBeNull()
    expect(normalizeFarcasterUsername('@')).toBeNull()
    expect(normalizeFarcasterUsername('a'.repeat(17))).toBeNull()
  })

  it('keeps ENS ahead of Farcaster by default', () => {
    expect(
      selectPreferredIdentity({
        address,
        ensName: 'builder.eth',
        farcaster: farcasterIdentity,
        preferFarcaster: false,
      })
    ).toMatchObject({ displayName: 'builder.eth', source: 'ens' })
  })

  it('puts Farcaster ahead of ENS only when the preference is enabled', () => {
    expect(
      selectPreferredIdentity({
        address,
        ensName: 'builder.eth',
        farcaster: farcasterIdentity,
        preferFarcaster: true,
      })
    ).toMatchObject({ displayName: '@builder', source: 'farcaster' })
  })

  it('falls back from ENS to Farcaster to the shortened address', () => {
    expect(
      selectPreferredIdentity({
        address,
        farcaster: farcasterIdentity,
        preferFarcaster: false,
      }).source
    ).toBe('farcaster')
    expect(selectPreferredIdentity({ address, preferFarcaster: false }).source).toBe(
      'address'
    )
  })
})

describe('resolveIdentityInput', () => {
  it('returns a checksum raw address without provider lookups', async () => {
    const resolveEns = vi.fn()
    const lookupFarcaster = vi.fn()

    await expect(
      resolveIdentityInput(address, { resolveEns, lookupFarcaster })
    ).resolves.toMatchObject({ status: 'resolved', source: 'address', address })
    expect(resolveEns).not.toHaveBeenCalled()
    expect(lookupFarcaster).not.toHaveBeenCalled()
  })

  it('treats @username as explicitly Farcaster and uses only the primary wallet', async () => {
    const resolveEns = vi.fn()
    const lookupFarcaster = vi.fn().mockResolvedValue(farcasterIdentity)

    await expect(
      resolveIdentityInput('@builder', { resolveEns, lookupFarcaster })
    ).resolves.toMatchObject({
      status: 'resolved',
      source: 'farcaster',
      address: otherAddress,
      farcaster: farcasterIdentity,
    })
    expect(resolveEns).not.toHaveBeenCalled()
  })

  it('blocks a bare name when ENS and Farcaster resolve differently', async () => {
    await expect(
      resolveIdentityInput('builder', {
        resolveEns: vi.fn().mockResolvedValue(address),
        lookupFarcaster: vi.fn().mockResolvedValue(farcasterIdentity),
      })
    ).resolves.toMatchObject({ status: 'ambiguous' })
  })

  it('accepts a bare name when ENS and Farcaster resolve to the same wallet', async () => {
    await expect(
      resolveIdentityInput('builder', {
        resolveEns: vi.fn().mockResolvedValue(otherAddress),
        lookupFarcaster: vi.fn().mockResolvedValue(farcasterIdentity),
      })
    ).resolves.toMatchObject({
      status: 'resolved',
      source: 'ens-and-farcaster',
      address: otherAddress,
    })
  })

  it('does not invent a Farcaster wallet fallback', async () => {
    await expect(
      resolveIdentityInput('@builder', {
        resolveEns: vi.fn(),
        lookupFarcaster: vi.fn().mockResolvedValue(null),
      })
    ).resolves.toMatchObject({ status: 'unresolved' })
  })

  it('freezes only the revalidated checksum transaction target', () => {
    expect(
      freezeResolvedIdentityTarget('@builder', {
        status: 'resolved',
        source: 'farcaster',
        input: '@builder',
        address: otherAddress,
        farcaster: farcasterIdentity,
      })
    ).toBe(otherAddress)
    expect(() =>
      freezeResolvedIdentityTarget('@changed', {
        status: 'resolved',
        source: 'farcaster',
        input: '@builder',
        address: otherAddress,
        farcaster: farcasterIdentity,
      })
    ).toThrow('changed or could not be revalidated')
    expect(() =>
      freezeResolvedIdentityTarget(
        '@builder',
        {
          status: 'resolved',
          source: 'farcaster',
          input: '@builder',
          address: otherAddress,
          farcaster: farcasterIdentity,
        },
        address
      )
    ).toThrow('changed during revalidation')
  })
})
