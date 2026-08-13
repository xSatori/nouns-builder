import { type Address, getAddress, isAddress } from 'viem'

import { selectPreferredIdentity } from './identity'
import { useEnsData } from './useEnsData'
import { useFarcasterIdentity } from './useFarcasterIdentity'
import { useIdentityPreference } from './useIdentityPreference'

export const useIdentityData = (address?: string) => {
  const ens = useEnsData(address)
  const farcaster = useFarcasterIdentity(address)
  const { preferFarcaster } = useIdentityPreference()
  const normalizedAddress =
    address && isAddress(address, { strict: false }) ? getAddress(address) : undefined
  const preferred = normalizedAddress
    ? selectPreferredIdentity({
        address: normalizedAddress as Address,
        ensName: ens.ensName,
        farcaster: farcaster.identity,
        preferFarcaster,
      })
    : { displayName: ens.displayName, source: 'address' as const }

  return {
    ...ens,
    ...farcaster,
    preferFarcaster,
    displayName: preferred.displayName,
    displaySource: preferred.source,
    avatar: preferred.avatarUrl ?? ens.ensAvatar,
    isLoading: ens.isLoading || farcaster.isLoading,
  }
}
