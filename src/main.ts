import * as core from '@actions/core'
import axios, {AxiosError, isAxiosError} from 'axios'

type HealthcheckEvent = {
  message: string
  event: string
}

const sendEvent = async (
  token: string,
  resourceId: string,
  event: HealthcheckEvent
): Promise<void> => {
  const healthcheckUrl = 'https://healthcheck.csf.elisa.fi'
  const maxRetries = 5
  let retryCount = 0

  while (retryCount < maxRetries) {
    try {
      await axios.post(
        `${healthcheckUrl}/api/v1/resources/${resourceId}/events`,
        event,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )
      return
    } catch (error) {
      retryCount++
      core.error(`Sending event failed: ${(error as AxiosError).message}`)
      core.info(`Retrying (${retryCount}/${maxRetries})...`)
      const delay = Math.pow(2, retryCount) * 1000
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw new Error('Request failed after maximum retries.')
}

async function run(): Promise<void> {
  try {
    const healthcheckUrl = 'http://healthcheck.csf.elisa.fi'
    const idToken = await core.getIDToken(healthcheckUrl)

    const resourceId = core.getInput('resource-id', {required: true})
    const message = core.getInput('message', {required: true})
    const event = core.getInput('event', {required: true})

    if (!['deploy', 'incident'].includes(event)) {
      core.setFailed(
        `Invalid event type: ${event}. Must be one of: deploy, incident`
      )
      return
    }

    const body: HealthcheckEvent = {
      message,
      event
    }

    await sendEvent(idToken, resourceId, body)
  } catch (error) {
    if (isAxiosError(error)) {
      core.setFailed(error.message)
    } else {
      core.setFailed((error as Error).message)
    }
  }
}

run()
