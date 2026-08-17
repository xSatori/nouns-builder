import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { ProfileSettingsButton } from './ProfileSettingsButton'

const accountState = vi.hoisted(() => ({ address: undefined as string | undefined }))

vi.mock('wagmi', () => ({
  useAccount: () => ({ address: accountState.address }),
  useConfig: () => ({}),
  useSwitchChain: () => ({ switchChainAsync: vi.fn() }),
}))

vi.mock('@buildeross/ui/Modal', () => ({
  AnimatedModal: ({ open, children }: { open?: boolean; children: React.ReactNode }) =>
    open ? children : null,
}))

const profileAddress = '0xAbCdEf0000000000000000000000000000000001' as const

describe('ProfileSettingsButton', () => {
  beforeEach(() => {
    accountState.address = undefined
    window.localStorage.clear()
  })

  it('only renders for the wallet that owns the viewed profile', () => {
    const { rerender } = render(<ProfileSettingsButton profileAddress={profileAddress} />)
    expect(screen.queryByRole('button', { name: 'Settings' })).not.toBeInTheDocument()

    accountState.address = profileAddress.toLowerCase()
    rerender(<ProfileSettingsButton profileAddress={profileAddress} />)
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument()

    accountState.address = '0x0000000000000000000000000000000000000002'
    rerender(<ProfileSettingsButton profileAddress={profileAddress} />)
    expect(screen.queryByRole('button', { name: 'Settings' })).not.toBeInTheDocument()
  })

  it('opens an accessible settings dialog and saves Farcaster priority on-device', async () => {
    accountState.address = profileAddress.toLowerCase()
    render(
      <ProfileSettingsButton
        profileAddress={profileAddress}
        identity={{
          website: { href: 'https://example.com', label: 'example.com' },
          x: { handle: 'builder', label: '@builder', url: 'https://x.com/builder' },
          farcaster: {
            handle: 'builder',
            label: '@builder',
            url: 'https://warpcast.com/builder',
          },
        }}
      />
    )

    const trigger = screen.getByRole('button', { name: 'Settings' })
    fireEvent.click(trigger)

    const dialog = screen.getByRole('dialog', { name: 'User Settings' })
    await waitFor(() => expect(dialog).toHaveFocus())
    expect(
      screen.getByText('Saved on this device. ENS stays first when disabled.')
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Links' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Identity' })).toHaveClass(
      screen.getByRole('heading', { name: 'Links' }).className
    )
    expect(screen.getByRole('textbox', { name: 'Website' })).toHaveValue(
      'https://example.com'
    )
    expect(screen.getByRole('textbox', { name: 'X' })).toHaveValue('@builder')
    expect(screen.getByRole('textbox', { name: 'Farcaster' })).toHaveValue('@builder')
    expect(screen.getByRole('button', { name: 'Save Settings' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('checkbox', { name: 'Prefer Farcaster names' }))
    expect(window.localStorage.getItem('nouns-builder:farcaster-priority')).toBe('true')

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(
      screen.queryByRole('dialog', { name: 'User Settings' })
    ).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})
