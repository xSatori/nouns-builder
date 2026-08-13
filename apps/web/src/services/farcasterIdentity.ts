import { type Address, getAddress, isAddress } from 'viem'
import { z } from 'zod'

const NEYNAR_API_URL = 'https://api.neynar.com/v2/farcaster/user'
const REQUEST_TIMEOUT_MS = 5_000

const NeynarUserSchema = z
  .object({
    fid: z.number().int().positive(),
    username: z.string().min(1),
    display_name: z.string().optional().nullable(),
    pfp_url: z.string().url().optional().nullable(),
    custody_address: z.string().optional().nullable(),
    verified_addresses: z
      .object({
        eth_addresses: z.array(z.string()).default([]),
        primary: z
          .object({ eth_address: z.string().optional().nullable() })
          .optional()
          .nullable(),
      })
      .optional()
      .nullable(),
  })
  .passthrough()

const UsernameResponseSchema = z.object({ user: NeynarUserSchema })
const AddressResponseSchema = z.record(z.string(), z.array(NeynarUserSchema))

type NeynarUser = z.infer<typeof NeynarUserSchema>

export type FarcasterIdentity = {
  fid: number
  username: string
  displayName?: string
  pfpUrl?: string
  primaryAddress: Address
  connectedAddresses: Address[]
  profileUrl: string
}

export type FarcasterAddressSelection =
  | { status: 'resolved'; identity: FarcasterIdentity }
  | { status: 'ambiguous'; identities: FarcasterIdentity[] }

export class FarcasterProviderError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'CONFIGURATION_ERROR'
      | 'NOT_FOUND'
      | 'NO_PRIMARY_WALLET'
      | 'RATE_LIMITED'
      | 'PROVIDER_ERROR'
      | 'INVALID_PROVIDER_RESPONSE',
    readonly status: number,
    readonly retryAfter?: string
  ) {
    super(message)
  }
}

const normalizeAddress = (value?: string | null): Address | null => {
  if (!value || !isAddress(value, { strict: false })) return null
  return getAddress(value)
}

export const normalizeNeynarUser = (input: unknown): FarcasterIdentity | null => {
  const parsed = NeynarUserSchema.safeParse(input)
  if (!parsed.success) return null
  const user = parsed.data
  const primaryAddress = normalizeAddress(user.verified_addresses?.primary?.eth_address)
  if (!primaryAddress) return null

  const connectedAddresses: Address[] = []
  const seen = new Set<string>()
  for (const candidate of [
    primaryAddress,
    ...(user.verified_addresses?.eth_addresses ?? []),
  ]) {
    const address = normalizeAddress(candidate)
    if (!address || seen.has(address.toLowerCase())) continue
    seen.add(address.toLowerCase())
    connectedAddresses.push(address)
  }

  const username = user.username.toLowerCase()
  return {
    fid: user.fid,
    username,
    ...(user.display_name ? { displayName: user.display_name } : {}),
    ...(user.pfp_url ? { pfpUrl: user.pfp_url } : {}),
    primaryAddress,
    connectedAddresses,
    profileUrl: `https://warpcast.com/${encodeURIComponent(username)}`,
  }
}

export const selectAddressIdentity = (
  address: string,
  identities: FarcasterIdentity[]
): FarcasterAddressSelection | null => {
  const normalizedAddress = normalizeAddress(address)
  if (!normalizedAddress || identities.length === 0) return null
  if (identities.length === 1) return { status: 'resolved', identity: identities[0] }

  const primaryMatches = identities.filter(
    (identity) =>
      identity.primaryAddress.toLowerCase() === normalizedAddress.toLowerCase()
  )
  if (primaryMatches.length === 1) {
    return { status: 'resolved', identity: primaryMatches[0] }
  }
  return { status: 'ambiguous', identities }
}

const fetchNeynar = async (path: string) => {
  const apiKey = process.env.NEYNAR_API_KEY
  if (!apiKey) {
    throw new FarcasterProviderError(
      'Farcaster identity resolution is not configured.',
      'CONFIGURATION_ERROR',
      503
    )
  }

  let response: Response
  try {
    response = await fetch(`${NEYNAR_API_URL}${path}`, {
      headers: { Accept: 'application/json', 'x-api-key': apiKey },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
  } catch {
    throw new FarcasterProviderError(
      'Farcaster identity provider is unavailable.',
      'PROVIDER_ERROR',
      502
    )
  }

  if (response.status === 404) {
    throw new FarcasterProviderError('Farcaster identity not found.', 'NOT_FOUND', 404)
  }
  if (response.status === 429) {
    throw new FarcasterProviderError(
      'Farcaster identity provider rate limit exceeded.',
      'RATE_LIMITED',
      429,
      response.headers.get('retry-after') ?? undefined
    )
  }
  if (!response.ok) {
    throw new FarcasterProviderError(
      'Farcaster identity provider request failed.',
      'PROVIDER_ERROR',
      502
    )
  }

  try {
    return await response.json()
  } catch {
    throw new FarcasterProviderError(
      'Farcaster identity provider returned an invalid response.',
      'INVALID_PROVIDER_RESPONSE',
      502
    )
  }
}

export const lookupFarcasterIdentityByUsername = async (
  username: string
): Promise<FarcasterIdentity> => {
  const body = await fetchNeynar(`/by_username/?username=${encodeURIComponent(username)}`)
  const parsed = UsernameResponseSchema.safeParse(body)
  if (!parsed.success) {
    throw new FarcasterProviderError(
      'Farcaster identity provider returned an invalid response.',
      'INVALID_PROVIDER_RESPONSE',
      502
    )
  }
  const identity = normalizeNeynarUser(parsed.data.user)
  if (!identity) {
    throw new FarcasterProviderError(
      'This Farcaster account has no primary EVM wallet.',
      'NO_PRIMARY_WALLET',
      422
    )
  }
  return identity
}

export const lookupFarcasterIdentityByAddress = async (
  address: Address
): Promise<FarcasterAddressSelection> => {
  const body = await fetchNeynar(
    `/bulk-by-address/?addresses=${encodeURIComponent(address)}`
  )
  const parsed = AddressResponseSchema.safeParse(body)
  if (!parsed.success) {
    throw new FarcasterProviderError(
      'Farcaster identity provider returned an invalid response.',
      'INVALID_PROVIDER_RESPONSE',
      502
    )
  }
  const users: NeynarUser[] = Object.values(parsed.data).flat()
  const identities = users
    .map(normalizeNeynarUser)
    .filter((identity): identity is FarcasterIdentity => identity !== null)
  const selection = selectAddressIdentity(address, identities)
  if (!selection) {
    throw new FarcasterProviderError('Farcaster identity not found.', 'NOT_FOUND', 404)
  }
  return selection
}
