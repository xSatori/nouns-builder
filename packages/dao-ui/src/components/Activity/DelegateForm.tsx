import { freezeResolvedIdentityTarget } from '@buildeross/hooks/identity'
import {
  isResolvedIdentity,
  useResolvedIdentityInput,
} from '@buildeross/hooks/useFarcasterIdentity'
import { tokenAbi } from '@buildeross/sdk/contract'
import { useChainStore, useDaoStore } from '@buildeross/stores'
import { ContractButton } from '@buildeross/ui/ContractButton'
import { SmartInput } from '@buildeross/ui/Fields'
import { Box, Button, Flex, Icon, Text } from '@buildeross/zord'
import React, { useState } from 'react'
import { useConfig } from 'wagmi'
import { simulateContract, waitForTransactionReceipt, writeContract } from 'wagmi/actions'

import { proposalFormTitle } from './Activity.css'

interface DelegateFormProps {
  handleBack: () => void
  handleUpdate: (address: string) => void
}

export const DelegateForm = ({ handleBack, handleUpdate }: DelegateFormProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const [delegateInput, setDelegateInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const {
    resolution,
    isLoading: isResolving,
    revalidate,
  } = useResolvedIdentityInput(delegateInput)
  const { addresses } = useDaoStore()
  const chain = useChainStore((x) => x.chain)
  const config = useConfig()

  const submitCallback = async () => {
    if (!addresses.token || !isResolvedIdentity(resolution)) return

    setIsLoading(true)
    setError(null)
    try {
      const refreshedResolution = await revalidate()
      const delegate = freezeResolvedIdentityTarget(
        delegateInput,
        refreshedResolution,
        resolution.address
      )
      const data = await simulateContract(config, {
        abi: tokenAbi,
        address: addresses.token,
        chainId: chain.id,
        functionName: 'delegate',
        args: [delegate],
      })
      const hash = await writeContract(config, data.request)
      await waitForTransactionReceipt(config, { hash, chainId: chain.id })

      handleUpdate(delegate)
    } catch (e) {
      console.error(e)
      setError(e instanceof Error ? e.message : 'Unable to update delegate.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Flex direction={'column'} width={'100%'}>
      <Box className={proposalFormTitle} fontSize={28} mb={'x4'}>
        Update delegate
      </Box>

      <Box mb={'x8'} color="text3">
        Enter the wallet address, ENS name, or Farcaster username of the account you would
        like to delegate your votes to.
      </Box>

      <SmartInput
        inputLabel="New Delegate"
        id="address"
        type="text"
        value={delegateInput}
        placeholder="0x..., name.eth, or @username"
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          setDelegateInput(event.target.value)
          setError(null)
        }}
        onBlur={() => undefined}
        errorMessage={
          !isResolving && resolution && !isResolvedIdentity(resolution)
            ? resolution.message
            : error || undefined
        }
        isAddress={true}
      />

      {isResolving ? (
        <Text color="text3" mt="x2" aria-live="polite">
          Resolving delegate target...
        </Text>
      ) : isResolvedIdentity(resolution) ? (
        <Box mt="x2" p="x3" border="normal" borderRadius="small">
          <Text fontSize="12">Resolved wallet: {resolution.address}</Text>
        </Box>
      ) : null}

      {isLoading ? (
        <Flex mt="x4">
          <Button width={'100%'} disabled size="lg">
            Updating delegate...
          </Button>
        </Flex>
      ) : (
        <Flex mt="x4">
          <Button variant="secondary" onClick={handleBack} size="lg">
            <Icon id="arrow-left" />
          </Button>
          <ContractButton
            chainId={chain.id}
            ml="x4"
            style={{ flex: 'auto' }}
            disabled={isResolving || !isResolvedIdentity(resolution)}
            size="lg"
            handleClick={submitCallback}
          >
            Update delegate
          </ContractButton>
        </Flex>
      )}
    </Flex>
  )
}
