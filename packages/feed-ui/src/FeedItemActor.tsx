import { useIdentityData } from '@buildeross/hooks/useIdentityData'
import type { AddressType } from '@buildeross/types'
import { WalletIdentityWithPreview } from '@buildeross/ui'
import React from 'react'

import { feedItemActorName } from './Feed.css'

interface FeedItemActorProps {
  address: AddressType
}

export const FeedItemActor: React.FC<FeedItemActorProps> = ({ address }) => {
  const { displayName, avatar } = useIdentityData(address)

  return (
    <WalletIdentityWithPreview
      address={address}
      displayName={displayName}
      avatarSrc={avatar}
      avatarSize="24"
      nameVariant="paragraph-sm"
      nameClassName={feedItemActorName}
      mobileTapBehavior="toggle"
    />
  )
}
