import type { ProposalCreatedFeedItem } from '@buildeross/types'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { ProposalCreatedItem } from './ProposalCreatedItem'

vi.mock('@buildeross/hooks/useIdentityData', () => ({
  useIdentityData: () => ({ displayName: 'Farcaster Display Name' }),
}))

const item = {
  type: 'PROPOSAL_CREATED',
  proposer: '0xabc0000000000000000000000000000000000001',
  daoId: '0xdef0000000000000000000000000000000000001',
  chainId: 8453,
  proposalNumber: '42',
  proposalTitle: 'Fund public goods',
  proposalDescription: '',
} as unknown as ProposalCreatedFeedItem

describe('ProposalCreatedItem', () => {
  it('renders the shared preferred identity in the activity feed', () => {
    render(<ProposalCreatedItem item={item} />)

    expect(screen.getByText('Farcaster Display Name proposed')).toBeInTheDocument()
  })
})
