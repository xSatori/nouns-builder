import { render, screen } from '@testing-library/react'
import React from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { WalletIdentityWithPreview } from './WalletIdentityWithPreview'

const mockUseIdentityData = vi.fn()

vi.mock('@buildeross/hooks/useIdentityData', () => ({
  useIdentityData: (address?: string) => mockUseIdentityData(address),
}))

vi.mock('../WalletProfilePreview', () => ({
  WalletProfilePreview: ({
    children,
    displayName,
    secondaryName,
  }: {
    children: React.ReactNode
    displayName?: string
    secondaryName?: string
  }) => (
    <div
      data-testid="wallet-profile-preview"
      data-display-name={displayName}
      data-secondary-name={secondaryName}
    >
      {children}
    </div>
  ),
}))

const address = '0xabc0000000000000000000000000000000000001' as const

describe('WalletIdentityWithPreview', () => {
  beforeEach(() => {
    mockUseIdentityData.mockReturnValue({
      displayName: 'Farcaster Display Name',
      displaySource: 'farcaster',
      ensName: 'legacy.eth',
      avatar: 'https://example.com/farcaster.png',
    })
  })

  it('uses the shared preferred identity for the trigger and profile hover popup', async () => {
    render(
      <WalletIdentityWithPreview
        address={address}
        displayName="legacy.eth"
        avatarSrc="https://example.com/ens.png"
      />
    )

    expect(screen.getByText('Farcaster Display Name')).toBeInTheDocument()
    expect(screen.queryByText('legacy.eth')).not.toBeInTheDocument()
    expect(screen.getByTestId('wallet-profile-preview')).toHaveAttribute(
      'data-display-name',
      'Farcaster Display Name'
    )
    expect(screen.getByTestId('wallet-profile-preview')).toHaveAttribute(
      'data-secondary-name',
      'legacy.eth'
    )
    expect(mockUseIdentityData).toHaveBeenCalledWith(address)
  })

  it('preserves a caller-provided fallback while the shared identity is unresolved', () => {
    mockUseIdentityData.mockReturnValue({
      displayName: '0xabc0...0001',
      displaySource: 'address',
      ensName: undefined,
      avatar: undefined,
    })

    render(<WalletIdentityWithPreview address={address} displayName="legacy.eth" />)

    expect(screen.getByText('legacy.eth')).toBeInTheDocument()
  })
})
