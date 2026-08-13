import { getEnsAddress } from '@buildeross/utils/ens'
import * as React from 'react'
import useSWR from 'swr'
import { type Address, isAddress } from 'viem'

import type {
  FarcasterIdentity,
  FarcasterLookupPayload,
  IdentityResolution,
} from './identity'
import { normalizeFarcasterUsername, resolveIdentityInput } from './identity'

type FarcasterApiErrorBody = {
  error?: { code?: string; message?: string }
}

export class FarcasterIdentityError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number
  ) {
    super(message)
  }
}

const fetchFarcasterIdentity = async (url: string): Promise<FarcasterLookupPayload> => {
  const response = await fetch(url, { headers: { Accept: 'application/json' } })
  const body = (await response.json().catch(() => ({}))) as
    | FarcasterLookupPayload
    | FarcasterApiErrorBody
  if (!response.ok) {
    const apiError = body as FarcasterApiErrorBody
    throw new FarcasterIdentityError(
      apiError.error?.message || 'Farcaster identity lookup failed.',
      apiError.error?.code || 'PROVIDER_ERROR',
      response.status
    )
  }
  return body as FarcasterLookupPayload
}

export const lookupFarcasterUsername = async (
  input: string,
  { fresh = false }: { fresh?: boolean } = {}
): Promise<FarcasterIdentity | null> => {
  const username = normalizeFarcasterUsername(input)
  if (!username) return null
  try {
    const result = await fetchFarcasterIdentity(
      `/api/farcaster-identity?username=${encodeURIComponent(username)}${fresh ? '&fresh=1' : ''}`
    )
    return result.status === 'resolved' ? result.identity : null
  } catch (error) {
    if (error instanceof FarcasterIdentityError && error.status === 404) return null
    throw error
  }
}

export const useFarcasterIdentity = (address?: string) => {
  const shouldFetch = !!address && isAddress(address, { strict: false })
  const { data, error, isLoading } = useSWR<FarcasterLookupPayload>(
    shouldFetch
      ? `/api/farcaster-identity?address=${encodeURIComponent(address as string)}`
      : null,
    fetchFarcasterIdentity,
    { dedupingInterval: 60_000, revalidateOnFocus: false }
  )

  return {
    identity: data?.status === 'resolved' ? data.identity : undefined,
    ambiguousIdentities: data?.status === 'ambiguous' ? data.identities : undefined,
    isLoading,
    error: error as FarcasterIdentityError | undefined,
  }
}

export const useResolvedIdentityInput = (
  input: string,
  { enabled = true, delayMs = 350 }: { enabled?: boolean; delayMs?: number } = {}
) => {
  const [debouncedInput, setDebouncedInput] = React.useState(input)

  React.useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedInput(input), delayMs)
    return () => window.clearTimeout(timeout)
  }, [delayMs, input])

  const trimmed = debouncedInput.trim()
  const { data, error, isLoading } = useSWR<IdentityResolution>(
    enabled && trimmed ? (['identity-input', trimmed] as const) : null,
    ([, value]: readonly [string, string]) =>
      resolveIdentityInput(value, {
        resolveEns: getEnsAddress,
        lookupFarcaster: lookupFarcasterUsername,
      }),
    { dedupingInterval: 30_000, revalidateOnFocus: false }
  )

  const isDebouncing = enabled && input.trim() !== debouncedInput.trim()
  return {
    resolution: data,
    error: error as Error | undefined,
    isLoading: isLoading || isDebouncing,
    revalidate: () =>
      resolveIdentityInput(input.trim(), {
        resolveEns: getEnsAddress,
        lookupFarcaster: (username) => lookupFarcasterUsername(username, { fresh: true }),
      }),
  }
}

export const isResolvedIdentity = (
  resolution?: IdentityResolution
): resolution is Extract<IdentityResolution, { status: 'resolved' }> =>
  resolution?.status === 'resolved'

export type { Address }
