import type { FarcasterIdentity } from '@buildeross/hooks/identity'
import { walletSnippet } from '@buildeross/utils/helpers'
import { Flex, Text } from '@buildeross/zord'
import Link from 'next/link'
import {
  connectedWalletLink,
  connectedWalletList,
  farcasterIdentityCard,
} from 'src/styles/profile.css'
import type { Address } from 'viem'

type FarcasterProfileIdentityProps = {
  identity?: FarcasterIdentity
  ambiguousIdentities?: FarcasterIdentity[]
  isLoading: boolean
  error?: Error
  profileAddress: Address
}

export const FarcasterProfileIdentity = ({
  identity,
  ambiguousIdentities,
  isLoading,
  error,
  profileAddress,
}: FarcasterProfileIdentityProps) => {
  if (isLoading) {
    return (
      <div className={farcasterIdentityCard} aria-live="polite">
        <Text color="text3">Checking verified Farcaster identity...</Text>
      </div>
    )
  }
  if (error) {
    return (
      <div className={farcasterIdentityCard} role="status">
        <Text color="text3">Verified Farcaster identity is unavailable.</Text>
      </div>
    )
  }
  if (ambiguousIdentities?.length) {
    return (
      <div className={farcasterIdentityCard} role="status">
        <Text color="text3">
          This wallet is linked to multiple Farcaster accounts, so no account is
          prioritized automatically.
        </Text>
      </div>
    )
  }
  if (!identity) return null

  return (
    <section
      className={farcasterIdentityCard}
      aria-labelledby="farcaster-identity-heading"
    >
      <Flex direction="column" gap="x2">
        <Text as="h2" id="farcaster-identity-heading" fontWeight="display">
          Verified Farcaster identity
        </Text>
        <Flex align="center" gap="x2" wrap>
          <a href={identity.profileUrl} target="_blank" rel="noopener noreferrer">
            @{identity.username}
          </a>
          {identity.displayName ? (
            <Text color="text3">{identity.displayName}</Text>
          ) : null}
        </Flex>
        <Text color="text3" fontSize="12">
          Social identity from Farcaster. Verify the wallet address before transacting.
        </Text>
      </Flex>

      <Flex direction="column" gap="x2">
        <Text as="h3" fontWeight="display" fontSize="14">
          Connected wallets
        </Text>
        {identity.connectedAddresses.length ? (
          <ul className={connectedWalletList}>
            {identity.connectedAddresses.map((address) => {
              const isPrimary =
                address.toLowerCase() === identity.primaryAddress.toLowerCase()
              const isCurrent = address.toLowerCase() === profileAddress.toLowerCase()
              return (
                <li key={address}>
                  <Link className={connectedWalletLink} href={`/profile/${address}`}>
                    <span>{walletSnippet(address)}</span>
                    <Text color="text3" fontSize="12">
                      EVM{isPrimary ? ' / Primary' : ''}
                      {isCurrent ? ' / Current' : ''}
                    </Text>
                  </Link>
                </li>
              )
            })}
          </ul>
        ) : (
          <Text color="text3">No verified EVM wallets are available.</Text>
        )}
      </Flex>
    </section>
  )
}
