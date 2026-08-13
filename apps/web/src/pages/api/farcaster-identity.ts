import { CACHE_TIMES } from '@buildeross/constants/cacheTimes'
import type { NextApiRequest, NextApiResponse } from 'next'
import {
  FarcasterProviderError,
  lookupFarcasterIdentityByAddress,
  lookupFarcasterIdentityByUsername,
} from 'src/services/farcasterIdentity'
import { withCors } from 'src/utils/api/cors'
import { withRateLimit } from 'src/utils/api/rateLimit'
import { getAddress, isAddress } from 'viem'

const FARCASTER_USERNAME_REGEX = /^[a-z0-9_.-]{1,16}$/

const sendError = (res: NextApiResponse, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } })

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Method not allowed.')
  }

  const usernameQuery = req.query.username
  const addressQuery = req.query.address
  const hasUsername = typeof usernameQuery === 'string' && usernameQuery.trim() !== ''
  const hasAddress = typeof addressQuery === 'string' && addressQuery.trim() !== ''
  if (hasUsername === hasAddress) {
    return sendError(
      res,
      400,
      'INVALID_QUERY',
      'Provide exactly one username or address.'
    )
  }

  try {
    let result
    if (hasUsername) {
      const username = usernameQuery.trim().replace(/^@/, '').toLowerCase()
      if (!FARCASTER_USERNAME_REGEX.test(username)) {
        return sendError(res, 400, 'INVALID_USERNAME', 'Invalid Farcaster username.')
      }
      result = {
        status: 'resolved' as const,
        identity: await lookupFarcasterIdentityByUsername(username),
      }
    } else {
      if (!isAddress(addressQuery as string, { strict: false })) {
        return sendError(res, 400, 'INVALID_ADDRESS', 'Invalid wallet address.')
      }
      result = await lookupFarcasterIdentityByAddress(getAddress(addressQuery as string))
    }

    const { maxAge, swr } = CACHE_TIMES.PROFILE
    res.setHeader(
      'Cache-Control',
      req.query.fresh === '1'
        ? 'private, no-store'
        : `public, s-maxage=${maxAge}, stale-while-revalidate=${swr}`
    )
    return res.status(200).json(result)
  } catch (error) {
    if (error instanceof FarcasterProviderError) {
      if (error.retryAfter) res.setHeader('Retry-After', error.retryAfter)
      return sendError(res, error.status, error.code, error.message)
    }
    console.error('Unexpected Farcaster identity error:', error)
    return sendError(res, 500, 'INTERNAL_ERROR', 'Unable to resolve Farcaster identity.')
  }
}

export default withCors()(
  withRateLimit({ maxRequests: 30, windowSeconds: 60, keyPrefix: 'farcaster-identity' })(
    handler
  )
)
