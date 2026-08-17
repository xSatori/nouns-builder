import { DaoVoter } from '@buildeross/sdk/subgraph'
import { render, screen } from '@testing-library/react'
import React from 'react'
import { describe, expect, it, vi } from 'vitest'

import { MemberCard } from './MemberListCard'

const mockUseIdentityData = vi.fn((address?: string) => ({
  displayName: address,
  avatar: undefined as string | undefined,
  ensName: undefined as string | undefined,
  ensAvatar: undefined as string | undefined,
  ethAddress: address,
  isLoading: false,
  error: undefined,
}))

vi.mock('@buildeross/hooks/useIdentityData', () => ({
  useIdentityData: (address?: string) => mockUseIdentityData(address),
}))

const member: DaoVoter = {
  voter: '0xabc0000000000000000000000000000000000001',
  tokens: [1, 2],
  tokenCount: 2,
  timeJoined: 1640995200,
}

describe('MemberCard', () => {
  it('renders the shared preferred identity display name', () => {
    mockUseIdentityData.mockReturnValueOnce({
      displayName: 'Farcaster Display Name',
      avatar: 'https://example.com/farcaster.png',
      ensName: 'legacy.eth',
      ensAvatar: undefined,
      ethAddress: member.voter,
      isLoading: false,
      error: undefined,
    })

    render(<MemberCard member={member} totalSupply={100} />)

    expect(screen.getByText('Farcaster Display Name')).toBeInTheDocument()
    expect(screen.queryByText('legacy.eth')).not.toBeInTheDocument()
  })

  it('renders member details', () => {
    render(<MemberCard member={member} totalSupply={100} />)

    expect(screen.getByText('2 Tokens')).toBeInTheDocument()
    expect(screen.getByText('2.00%')).toBeInTheDocument()
    expect(screen.getByText(/Dec 31, 2021|Jan 01, 2022/)).toBeInTheDocument()
  })

  it('renders Active badge when isActive', () => {
    render(<MemberCard member={member} totalSupply={100} isActive />)

    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  it('renders Auction House badge when the member is the auction contract', () => {
    render(
      <MemberCard
        member={member}
        totalSupply={100}
        isActive
        auctionAddress={member.voter}
      />
    )

    expect(screen.getByText('Auction House')).toBeInTheDocument()
    expect(screen.queryByText('Active')).toBeNull()
  })

  it('renders Treasury badge when the member is the treasury contract', () => {
    render(
      <MemberCard
        member={member}
        totalSupply={100}
        isActive
        treasuryAddress={member.voter}
      />
    )

    expect(screen.getByText('Treasury')).toBeInTheDocument()
    expect(screen.queryByText('Active')).toBeNull()
  })

  it('does not render badge when isActive is false or undefined', () => {
    const { rerender } = render(
      <MemberCard member={member} totalSupply={100} isActive={false} />
    )
    expect(screen.queryByText('Active')).toBeNull()

    rerender(<MemberCard member={member} totalSupply={100} />)
    expect(screen.queryByText('Active')).toBeNull()
  })
})
