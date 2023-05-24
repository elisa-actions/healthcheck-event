import * as core from '@actions/core'
import * as httpm from '@actions/http-client'

type HealthcheckEvent = {
  message: string
  event: string
}

const sendEvent = async (
  healthcheckUrl: string,
  token: string,
  resourceId: string,
  event: HealthcheckEvent
): Promise<void> => {
  const maxRetries = 3
  let retryCount = 0

  const http = new httpm.HttpClient('healthcheck-event-action')
  while (retryCount < maxRetries) {
    try {
      await http.post(
        `${healthcheckUrl}/api/v1/resources/${resourceId}/events`,
        JSON.stringify(event),
        {
          Authorization: `Bearer ${token}`
        }
      )
      return
    } catch (error) {
      retryCount++
      core.info(
        `Sending event failed: ${
          (error as Error).message
        }, retrying (${retryCount}/${maxRetries})`
      )
      const delay = Math.pow(2, retryCount) * 1000
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw new Error('Request failed after maximum retries.')
}

async function run(): Promise<void> {
  try {
    const healthcheckUrl =
      'https://mgrkm4ait3.execute-api.eu-central-1.amazonaws.com/prod/test'
    const idToken = await core.getIDToken(healthcheckUrl)

    const resourceId = core.getInput('resourceid', {required: true})
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

    await sendEvent(healthcheckUrl, idToken, resourceId, body)
  } catch (error) {
    core.setFailed((error as Error).message)
  }
}

run()
