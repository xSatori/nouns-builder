import { render, screen } from '@testing-library/react'

import { ProfileIdentityFields } from './ProfileIdentityFields'

const verifiedFarcasterIdentity = {
  fid: 1,
  username: 'official-builder',
  displayName: 'Official Builder',
  primaryAddress: '0x0000000000000000000000000000000000000001' as const,
  connectedAddresses: ['0x0000000000000000000000000000000000000001'] as const,
  profileUrl: 'https://warpcast.com/official-builder',
}

describe('ProfileIdentityFields', () => {
  it('renders only supported identity URLs and places links before the bio', () => {
    render(
      <ProfileIdentityFields
        identity={{
          bio: 'Builder and collector',
          website: { href: 'https://example.com', label: 'example.com' },
          x: { handle: 'builder', url: 'https://x.com/builder', label: '@builder' },
          farcaster: {
            handle: 'builder',
            url: 'https://warpcast.com/builder',
            label: '@builder',
          },
        }}
      />
    )

    const website = screen.getByRole('link', { name: 'Open example.com' })
    const bio = screen.getByText('Builder and collector')

    expect(website).toHaveAttribute('href', 'https://example.com')
    expect(screen.getByRole('link', { name: 'Open @builder on X' })).toHaveAttribute(
      'href',
      'https://x.com/builder'
    )
    expect(
      screen.getByRole('link', { name: 'Open @builder on Farcaster' })
    ).toHaveAttribute('href', 'https://warpcast.com/builder')
    expect(website.compareDocumentPosition(bio) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    )
  })

  it('does not invent links when no supported identity data exists', () => {
    const { container } = render(<ProfileIdentityFields identity={{}} />)

    expect(container).toBeEmptyDOMElement()
  })

  it('uses the provider-verified Farcaster account instead of the EAS-authored link', () => {
    render(
      <ProfileIdentityFields
        identity={{
          farcaster: {
            handle: 'eas-builder',
            url: 'https://warpcast.com/eas-builder',
            label: '@eas-builder',
          },
        }}
        verifiedFarcasterIdentity={verifiedFarcasterIdentity}
      />
    )

    expect(
      screen.getByRole('link', { name: 'Open @official-builder on Farcaster (verified)' })
    ).toHaveAttribute('href', 'https://farcaster.xyz/official-builder')
    expect(screen.queryByText('@eas-builder')).not.toBeInTheDocument()
    expect(screen.getByTestId('farcaster-arch-logo')).toBeInTheDocument()
    expect(screen.getByLabelText('Verified Farcaster account')).toBeInTheDocument()
  })
})
