import type { FarcasterIdentity } from '@buildeross/hooks/identity'
import { Box, Flex, Icon, Text } from '@buildeross/zord'
import React from 'react'
import { farcasterArchLogo, verifiedIdentityMark } from 'src/styles/profile.css'
import type { ProfileIdentity } from 'src/utils/profileIdentity'

type ProfileIdentityFieldsProps = {
  identity?: ProfileIdentity
  verifiedFarcasterIdentity?: FarcasterIdentity
}

export const ProfileIdentityFields: React.FC<ProfileIdentityFieldsProps> = ({
  identity,
  verifiedFarcasterIdentity,
}) => {
  if (
    !identity?.bio &&
    !identity?.website &&
    !identity?.x &&
    !identity?.farcaster &&
    !verifiedFarcasterIdentity
  )
    return null

  const farcasterProfile = verifiedFarcasterIdentity
    ? {
        label: `@${verifiedFarcasterIdentity.username}`,
        url: `https://farcaster.xyz/${encodeURIComponent(verifiedFarcasterIdentity.username)}`,
        isVerified: true,
      }
    : identity?.farcaster
      ? { ...identity.farcaster, isVerified: false }
      : undefined

  return (
    <Flex mt="x4" direction="column" gap="x3" align="flex-start">
      {(identity?.website || identity?.x || farcasterProfile) && (
        <Flex gap="x2" wrap>
          {identity?.website ? (
            <Box
              as="a"
              href={identity.website.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${identity.website.label}`}
              color="text2"
              style={{ textDecoration: 'none' }}
            >
              <Flex align="center" gap="x1">
                <Icon id="globe" size="sm" />
                <Text>{identity.website.label}</Text>
              </Flex>
            </Box>
          ) : null}

          {identity?.x ? (
            <Box
              as="a"
              href={identity.x.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${identity.x.label} on X`}
              color="text2"
              style={{ textDecoration: 'none' }}
            >
              <Flex align="center" gap="x1">
                <Icon id="x" size="sm" />
                <Text>{identity.x.label}</Text>
              </Flex>
            </Box>
          ) : null}

          {farcasterProfile ? (
            <Box
              as="a"
              href={farcasterProfile.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Open ${farcasterProfile.label} on Farcaster${
                farcasterProfile.isVerified ? ' (verified)' : ''
              }`}
              color="text2"
              style={{ textDecoration: 'none' }}
            >
              <Flex align="center" gap="x1">
                <svg
                  data-testid="farcaster-arch-logo"
                  className={farcasterArchLogo}
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                >
                  <path d="M2 3h12v2H2V3Zm1 2h2v8H3V5Zm8 0h2v8h-2V5ZM5 5h6v2H5V5Zm1 2h4v2H6V7Zm-1 4h2v2H5v-2Zm4 0h2v2H9v-2Z" />
                </svg>
                <Text>{farcasterProfile.label}</Text>
                {farcasterProfile.isVerified ? (
                  <span
                    className={verifiedIdentityMark}
                    aria-label="Verified Farcaster account"
                  >
                    <Icon id="check-in-circle" size="sm" />
                  </span>
                ) : null}
              </Flex>
            </Box>
          ) : null}
        </Flex>
      )}

      {identity?.bio ? (
        <Text
          color="text2"
          style={{
            lineHeight: 1.5,
            maxWidth: '320px',
            whiteSpace: 'pre-line',
            wordBreak: 'break-word',
          }}
        >
          {identity.bio}
        </Text>
      ) : null}
    </Flex>
  )
}
