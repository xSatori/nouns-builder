import { useIdentityPreference } from '@buildeross/hooks/useIdentityPreference'
import { Flex, Text } from '@buildeross/zord'
import { identityPreferenceToggle } from 'src/styles/profile.css'

export const IdentityPreferenceToggle = () => {
  const { preferFarcaster, setPreferFarcaster } = useIdentityPreference()

  return (
    <label className={identityPreferenceToggle}>
      <input
        type="checkbox"
        checked={preferFarcaster}
        onChange={(event) => setPreferFarcaster(event.target.checked)}
      />
      <Flex direction="column" gap="x1">
        <Text fontSize="14" fontWeight="display">
          Prefer Farcaster names
        </Text>
        <Text color="text3" fontSize="12">
          Saved on this device. ENS stays first when disabled.
        </Text>
      </Flex>
    </label>
  )
}
