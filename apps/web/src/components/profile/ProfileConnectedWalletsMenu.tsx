import type { FarcasterIdentity } from '@buildeross/hooks/identity'
import { walletSnippet } from '@buildeross/utils/helpers'
import { Icon, Text } from '@buildeross/zord'
import Link from 'next/link'
import React from 'react'
import {
  connectedWalletAddress,
  connectedWalletBadge,
  connectedWalletExternalLink,
  connectedWalletMenu,
  connectedWalletMenuItem,
  connectedWalletMenuList,
  connectedWalletMenuRoot,
  connectedWalletTrigger,
  profileWalletAddress,
} from 'src/styles/profile.css'
import type { Address } from 'viem'

type ProfileConnectedWalletsMenuProps = {
  profileAddress: Address
  identity?: FarcasterIdentity
}

export const ProfileConnectedWalletsMenu = ({
  profileAddress,
  identity,
}: ProfileConnectedWalletsMenuProps) => {
  const disclosureId = React.useId().replace(/:/g, '')
  const rootRef = React.useRef<HTMLDivElement>(null)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const pointerFocusRef = React.useRef(false)
  const closeTimerRef = React.useRef<number | null>(null)
  const [isOpen, setIsOpen] = React.useState(false)

  const clearCloseTimer = React.useCallback(() => {
    if (closeTimerRef.current === null) return
    window.clearTimeout(closeTimerRef.current)
    closeTimerRef.current = null
  }, [])

  const openDisclosure = React.useCallback(() => {
    clearCloseTimer()
    setIsOpen(true)
  }, [clearCloseTimer])

  const schedulePointerClose = React.useCallback(() => {
    clearCloseTimer()
    if (rootRef.current?.contains(document.activeElement)) return
    closeTimerRef.current = window.setTimeout(() => setIsOpen(false), 100)
  }, [clearCloseTimer])

  React.useEffect(() => clearCloseTimer, [clearCloseTimer])

  React.useEffect(() => {
    if (!isOpen) return

    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        clearCloseTimer()
        setIsOpen(false)
      }
    }
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      clearCloseTimer()
      triggerRef.current?.focus()
      setIsOpen(false)
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [clearCloseTimer, isOpen])

  if (!identity?.connectedAddresses.length) {
    return (
      <span className={profileWalletAddress} title={profileAddress}>
        {profileAddress}
      </span>
    )
  }

  return (
    <div
      ref={rootRef}
      className={connectedWalletMenuRoot}
      onMouseEnter={openDisclosure}
      onMouseLeave={schedulePointerClose}
      onFocusCapture={() => {
        if (!pointerFocusRef.current) openDisclosure()
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsOpen(false)
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        className={[profileWalletAddress, connectedWalletTrigger].join(' ')}
        title={profileAddress}
        aria-label="Show verified connected wallets"
        aria-expanded={isOpen}
        aria-controls={disclosureId}
        onPointerDown={() => {
          pointerFocusRef.current = true
        }}
        onPointerUp={() => {
          pointerFocusRef.current = false
        }}
        onPointerCancel={() => {
          pointerFocusRef.current = false
        }}
        onClick={() => setIsOpen((open) => !open)}
      >
        {profileAddress}
      </button>

      {isOpen ? (
        <div
          id={disclosureId}
          className={connectedWalletMenu}
          role="region"
          aria-label="Verified Farcaster Wallets"
          onMouseEnter={clearCloseTimer}
        >
          <Text fontWeight="display">Verified Farcaster Wallets</Text>
          <ul className={connectedWalletMenuList}>
            {identity.connectedAddresses.map((address) => {
              const isPrimary =
                address.toLowerCase() === identity.primaryAddress.toLowerCase()
              const isCurrent = address.toLowerCase() === profileAddress.toLowerCase()
              const snippet = walletSnippet(address)

              return (
                <li key={address} className={connectedWalletMenuItem}>
                  <Link
                    href={`/profile/${address}`}
                    className={connectedWalletAddress}
                    aria-label={`View ${snippet} profile on Nouns Builder`}
                  >
                    <span>{snippet}</span>
                    <span>
                      {isPrimary ? (
                        <span className={connectedWalletBadge}>Primary</span>
                      ) : null}
                      {isCurrent ? (
                        <span className={connectedWalletBadge}>Current</span>
                      ) : null}
                    </span>
                  </Link>
                  <a
                    href={`https://etherscan.io/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={connectedWalletExternalLink}
                    aria-label={`View ${snippet} on Etherscan`}
                  >
                    <Icon id="external-16" size="sm" />
                  </a>
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
