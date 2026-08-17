import type { AddressType } from '@buildeross/types'
import { AnimatedModal } from '@buildeross/ui/Modal'
import { Button, Text } from '@buildeross/zord'
import React from 'react'
import {
  profileSettingsDialog,
  profileSettingsHeader,
  profileSettingsSection,
} from 'src/styles/profile.css'
import { isOwnProfileAddress } from 'src/utils/profileDashboard'
import type { ProfileIdentity } from 'src/utils/profileIdentity'
import { useAccount } from 'wagmi'

import { IdentityPreferenceToggle } from './IdentityPreferenceToggle'
import { ProfileLinksSettingsSection } from './ProfileLinksSettingsSection'

type ProfileSettingsButtonProps = {
  identity?: ProfileIdentity
  profileAddress: AddressType
  onSaved?: () => void
}

type ProfileSettingsModalProps = {
  identity?: ProfileIdentity
  open: boolean
  onClose: () => void
  onSaved?: () => void
  profileAddress: AddressType
}

const ProfileSettingsModal = ({
  identity,
  open,
  onClose,
  onSaved,
  profileAddress,
}: ProfileSettingsModalProps) => {
  const titleId = React.useId().replace(/:/g, '')
  const dialogRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    dialogRef.current?.focus()

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab' || !dialogRef.current) return

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        )
      )
      if (!focusable.length) {
        event.preventDefault()
        dialogRef.current.focus()
        return
      }

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === dialogRef.current)
      ) {
        event.preventDefault()
        last.focus()
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || document.activeElement === dialogRef.current)
      ) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', closeOnEscape)
    return () => document.removeEventListener('keydown', closeOnEscape)
  }, [onClose, open])

  return (
    <AnimatedModal open={open} close={onClose} size="medium">
      <div
        ref={dialogRef}
        className={profileSettingsDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className={profileSettingsHeader}>
          <Text as="h2" id={titleId} variant="heading-sm">
            User Settings
          </Text>
          <Button
            variant="ghost"
            size="sm"
            px="x2"
            icon="cross-16"
            iconSize="sm"
            aria-label="Close profile settings"
            onClick={onClose}
          />
        </div>

        <div className={profileSettingsSection}>
          <Text as="h3" variant="heading-sm">
            Identity
          </Text>
          <IdentityPreferenceToggle />
        </div>

        <ProfileLinksSettingsSection
          identity={identity}
          profileAddress={profileAddress}
          onClose={onClose}
          onSaved={onSaved}
        />
      </div>
    </AnimatedModal>
  )
}

export const ProfileSettingsButton = ({
  identity,
  profileAddress,
  onSaved,
}: ProfileSettingsButtonProps) => {
  const { address } = useAccount()
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const [isOpen, setIsOpen] = React.useState(false)
  const isOwnProfile = isOwnProfileAddress(address, profileAddress)

  const closeSettings = React.useCallback(() => {
    setIsOpen(false)
    triggerRef.current?.focus()
  }, [])

  if (!isOwnProfile) return null

  return (
    <>
      <Button
        ref={triggerRef}
        variant="outline"
        size="sm"
        px="x3"
        onClick={() => setIsOpen(true)}
      >
        Settings
      </Button>
      <ProfileSettingsModal
        identity={identity}
        profileAddress={profileAddress}
        open={isOpen}
        onClose={closeSettings}
        onSaved={onSaved}
      />
    </>
  )
}
