import { act, fireEvent, render, screen, within } from '@testing-library/react'

import { ProfileConnectedWalletsMenu } from './ProfileConnectedWalletsMenu'

const profileAddress = '0x0000000000000000000000000000000000000002' as const
const identity = {
  fid: 1,
  username: 'builder',
  primaryAddress: '0x0000000000000000000000000000000000000001' as const,
  connectedAddresses: [
    '0x0000000000000000000000000000000000000001',
    profileAddress,
  ] as const,
  profileUrl: 'https://warpcast.com/builder',
}

describe('ProfileConnectedWalletsMenu', () => {
  it('lists provider-verified wallets with Builder and Etherscan destinations', () => {
    render(
      <ProfileConnectedWalletsMenu profileAddress={profileAddress} identity={identity} />
    )

    const trigger = screen.getByRole('button', {
      name: 'Show verified connected wallets',
    })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')

    fireEvent.pointerDown(trigger)
    fireEvent.focus(trigger)
    fireEvent.pointerUp(trigger)
    fireEvent.click(trigger)

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    const disclosure = screen.getByRole('region', { name: 'Verified Farcaster Wallets' })
    expect(within(disclosure).getByText('Primary')).toBeInTheDocument()
    expect(within(disclosure).getByText('Current')).toBeInTheDocument()
    expect(
      within(disclosure).getByRole('link', {
        name: 'View 0x000…00001 profile on Nouns Builder',
      })
    ).toHaveAttribute('href', '/profile/0x0000000000000000000000000000000000000001')
    expect(
      within(disclosure).getByRole('link', {
        name: 'View 0x000…00001 on Etherscan',
      })
    ).toHaveAttribute(
      'href',
      'https://etherscan.io/address/0x0000000000000000000000000000000000000001'
    )
  })

  it('opens on hover, closes with Escape, and returns focus to the trigger', () => {
    render(
      <ProfileConnectedWalletsMenu profileAddress={profileAddress} identity={identity} />
    )

    const trigger = screen.getByRole('button', {
      name: 'Show verified connected wallets',
    })
    fireEvent.mouseEnter(trigger.parentElement as HTMLElement)
    expect(
      screen.getByRole('region', { name: 'Verified Farcaster Wallets' })
    ).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(
      screen.queryByRole('region', { name: 'Verified Farcaster Wallets' })
    ).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('stays open while the pointer moves from the trigger into the disclosure', () => {
    vi.useFakeTimers()
    try {
      render(
        <ProfileConnectedWalletsMenu
          profileAddress={profileAddress}
          identity={identity}
        />
      )

      const trigger = screen.getByRole('button', {
        name: 'Show verified connected wallets',
      })
      const root = trigger.parentElement as HTMLElement
      fireEvent.mouseEnter(root)
      const disclosure = screen.getByRole('region', {
        name: 'Verified Farcaster Wallets',
      })

      fireEvent.mouseLeave(root, { relatedTarget: document.body })
      fireEvent.mouseEnter(disclosure, { relatedTarget: document.body })
      act(() => vi.advanceTimersByTime(150))
      expect(disclosure).toBeInTheDocument()

      fireEvent.mouseLeave(root, { relatedTarget: document.body })
      act(() => vi.advanceTimersByTime(150))
      expect(
        screen.queryByRole('region', { name: 'Verified Farcaster Wallets' })
      ).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('renders a non-interactive address when no verified identity exists', () => {
    render(<ProfileConnectedWalletsMenu profileAddress={profileAddress} />)

    expect(screen.getByText(profileAddress)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Show verified connected wallets' })
    ).not.toBeInTheDocument()
  })
})
