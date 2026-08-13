import { walletSnippet } from '@buildeross/utils/helpers'
import { type Address, getAddress, isAddress } from 'viem'

const FARCASTER_USERNAME_REGEX = /^[a-z0-9_.-]{1,16}$/

export type FarcasterIdentity = {
  fid: number
  username: string
  displayName?: string
  pfpUrl?: string
  primaryAddress: Address
  connectedAddresses: readonly Address[]
  profileUrl: string
}

export type FarcasterLookupPayload =
  | { status: 'resolved'; identity: FarcasterIdentity }
  | { status: 'ambiguous'; identities: FarcasterIdentity[] }

export type PreferredIdentity = {
  displayName: string
  avatarUrl?: string
  source: 'ens' | 'farcaster' | 'address'
}

export type IdentityResolution =
  | {
      status: 'resolved'
      source: 'address' | 'ens' | 'farcaster' | 'ens-and-farcaster'
      address: Address
      input: string
      ensName?: string
      farcaster?: FarcasterIdentity
    }
  | {
      status: 'ambiguous'
      input: string
      ensAddress: Address
      farcasterAddress: Address
      farcaster: FarcasterIdentity
      message: string
    }
  | {
      status: 'invalid' | 'unresolved' | 'unavailable'
      input: string
      message: string
    }

export const normalizeFarcasterUsername = (value?: string | null): string | null => {
  const username = value?.trim().replace(/^@/, '').toLowerCase()
  if (!username || !FARCASTER_USERNAME_REGEX.test(username)) return null
  return username
}

export const selectPreferredIdentity = ({
  address,
  ensName,
  farcaster,
  preferFarcaster,
}: {
  address: Address
  ensName?: string
  farcaster?: FarcasterIdentity
  preferFarcaster: boolean
}): PreferredIdentity => {
  if (preferFarcaster && farcaster) {
    return {
      displayName: `@${farcaster.username}`,
      avatarUrl: farcaster.pfpUrl,
      source: 'farcaster',
    }
  }
  if (ensName) return { displayName: ensName, source: 'ens' }
  if (farcaster) {
    return {
      displayName: `@${farcaster.username}`,
      avatarUrl: farcaster.pfpUrl,
      source: 'farcaster',
    }
  }
  return { displayName: walletSnippet(address), source: 'address' }
}

type IdentityResolvers = {
  resolveEns: (name: string) => Promise<string | null | undefined>
  lookupFarcaster: (username: string) => Promise<FarcasterIdentity | null>
}

const safeAddress = (value?: string | null): Address | null => {
  if (!value || !isAddress(value, { strict: false })) return null
  return getAddress(value)
}

export const resolveIdentityInput = async (
  rawInput: string,
  { resolveEns, lookupFarcaster }: IdentityResolvers
): Promise<IdentityResolution> => {
  const input = rawInput.trim()
  if (!input) {
    return {
      status: 'invalid',
      input,
      message: 'Enter a wallet address, ENS name, or Farcaster username.',
    }
  }

  const rawAddress = safeAddress(input)
  if (rawAddress)
    return { status: 'resolved', source: 'address', address: rawAddress, input }

  const isExplicitFarcaster = input.startsWith('@')
  const username = normalizeFarcasterUsername(input)
  if (isExplicitFarcaster) {
    if (!username) {
      return { status: 'invalid', input, message: 'Enter a valid Farcaster username.' }
    }
    try {
      const farcaster = await lookupFarcaster(username)
      if (!farcaster) {
        return {
          status: 'unresolved',
          input,
          message: `No Farcaster account was found for @${username}.`,
        }
      }
      return {
        status: 'resolved',
        source: 'farcaster',
        address: farcaster.primaryAddress,
        input,
        farcaster,
      }
    } catch {
      return {
        status: 'unavailable',
        input,
        message: 'Farcaster resolution is temporarily unavailable. Try again.',
      }
    }
  }

  const [ensResult, farcasterResult] = await Promise.allSettled([
    resolveEns(input),
    username ? lookupFarcaster(username) : Promise.resolve(null),
  ])
  const ensAddress =
    ensResult.status === 'fulfilled' ? safeAddress(ensResult.value) : null
  const farcaster = farcasterResult.status === 'fulfilled' ? farcasterResult.value : null

  if (ensAddress && farcaster && ensAddress !== farcaster.primaryAddress) {
    return {
      status: 'ambiguous',
      input,
      ensAddress,
      farcasterAddress: farcaster.primaryAddress,
      farcaster,
      message: `${input} resolves to different ENS and Farcaster wallets. Use @${farcaster.username} for Farcaster or enter the wallet address directly.`,
    }
  }
  if (ensAddress && farcaster) {
    return {
      status: 'resolved',
      source: 'ens-and-farcaster',
      address: ensAddress,
      input,
      ensName: input,
      farcaster,
    }
  }
  if (ensAddress) {
    return {
      status: 'resolved',
      source: 'ens',
      address: ensAddress,
      input,
      ensName: input,
    }
  }
  if (farcaster) {
    return {
      status: 'resolved',
      source: 'farcaster',
      address: farcaster.primaryAddress,
      input,
      farcaster,
    }
  }
  if (ensResult.status === 'rejected' && farcasterResult.status === 'rejected') {
    return {
      status: 'unavailable',
      input,
      message: 'Name resolution is temporarily unavailable. Try again.',
    }
  }
  return {
    status: 'unresolved',
    input,
    message: 'This value did not resolve to a wallet address.',
  }
}

export const freezeResolvedIdentityTarget = (
  currentInput: string,
  resolution?: IdentityResolution,
  expectedAddress?: Address
): Address => {
  if (
    resolution?.status !== 'resolved' ||
    resolution.input.trim() !== currentInput.trim()
  ) {
    throw new Error('The delegate target changed or could not be revalidated.')
  }
  if (
    expectedAddress &&
    resolution.address.toLowerCase() !== expectedAddress.toLowerCase()
  ) {
    throw new Error('The delegate target changed during revalidation. Review it again.')
  }
  return resolution.address
}
