import { useIdentityData } from '@buildeross/hooks/useIdentityData'
import { WalletIdentityWithPreview } from '@buildeross/ui'
import { zeroAddress } from 'viem'

import { AuctionDetail } from './AuctionDetail'

export const WinningBidder = ({ owner }: { owner?: string }) => {
  const { displayName, avatar } = useIdentityData(owner)

  return (
    <AuctionDetail title="Held by">
      {!owner || owner === zeroAddress ? (
        'n/a'
      ) : (
        <WalletIdentityWithPreview
          address={owner as `0x${string}`}
          displayName={displayName}
          avatarSrc={avatar}
          avatarSize="24"
          mobileTapBehavior="toggle"
        />
      )}
    </AuctionDetail>
  )
}
