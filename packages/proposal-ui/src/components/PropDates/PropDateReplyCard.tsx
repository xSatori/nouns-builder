import { useIdentityData } from '@buildeross/hooks/useIdentityData'
import { type PropDate } from '@buildeross/sdk/subgraph'
import { WalletIdentityWithPreview } from '@buildeross/ui'
import { MarkdownDisplay } from '@buildeross/ui/MarkdownDisplay'
import { formatTimeAgo } from '@buildeross/utils/formatTime'
import { walletSnippet } from '@buildeross/utils/helpers'
import { Box, Flex, Text } from '@buildeross/zord'

import { proposalDescription as messageStyle } from '../ProposalDescription/ProposalDescription.css'

export const PropDateReplyCard = ({ reply }: { reply: PropDate }) => {
  const { displayName, avatar } = useIdentityData(reply.creator)

  return (
    <Flex direction="row" gap="x2" align="flex-start" mb="x3">
      <WalletIdentityWithPreview
        address={reply.creator as `0x${string}`}
        displayName={displayName || walletSnippet(reply.creator)}
        avatarSrc={avatar}
        avatarSize="24"
        nameVariant="label-sm"
        nameWeight="display"
        mobileTapBehavior="toggle"
      />
      <Box
        backgroundColor="background2"
        borderRadius="curved"
        borderColor="border"
        borderWidth="normal"
        borderStyle="solid"
        pt="x4"
        px="x4"
        style={{ width: '100%', minWidth: 0 }}
      >
        <Text variant="label-sm" color="text3" mb="x1">
          {formatTimeAgo(reply.timeCreated)}
        </Text>
        <Box className={messageStyle}>
          <MarkdownDisplay>{reply.message}</MarkdownDisplay>
        </Box>
      </Box>
    </Flex>
  )
}
