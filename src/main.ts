import * as core from '@actions/core'
import {HttpClient, HttpClientResponse} from '@actions/http-client'

type HealthcheckEvent = {
  message: string
  type: string
}

type HealthcheckError = {
  code: number
  message: string
}

const sendEvent = async (
  healthcheckUrl: string,
  canary: boolean,
  token: string,
  resourceId: string,
  event: HealthcheckEvent
): Promise<HttpClientResponse> => {
  const maxRetries = 3
  let retryCount = 0

  const http = new HttpClient('healthcheck-event-action')
  const eventUrl = `${healthcheckUrl}/v1/management/resource/${resourceId}/event`
  core.debug(`Sending event to ${eventUrl}`)

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`
  }

  if (canary) {
    headers['X-Canary'] = 'always'
  }

  while (retryCount < maxRetries) {
    try {
      return await http.post(eventUrl, JSON.stringify(event), headers)
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
    const healthcheckUrl = 'https://healthcheck.csf.elisa.fi'
    const idToken = await core.getIDToken(healthcheckUrl)

    const resourceId = core.getInput('resourceid', {required: true})
    const message = core.getInput('message', {required: true})
    const type = core.getInput('type', {required: true})
    const canary = core.getInput('canary', {required: false}) === 'true'

    if (!['deployment', 'incident'].includes(type)) {
      core.setFailed(
        `Invalid event type: ${type}. Must be one of: deployment, incident`
      )
      return
    }

    const event: HealthcheckEvent = {
      message,
      type
    }

    const res = await sendEvent(
      healthcheckUrl,
      canary,
      idToken,
      resourceId,
      event
    )
    const responseBody = await res.readBody()

    core.debug(`Response status code: ${res.message.statusCode}`)
    core.debug(`Response body: ${responseBody}`)
    core.debug(`Response headers: ${JSON.stringify(res.message.headers)}`)

    if (res.message.statusCode && res.message.statusCode > 299) {
      const healthcheckErrorResponse: HealthcheckError =
        JSON.parse(responseBody)
      core.setFailed(
        `Failed to send event: ${healthcheckErrorResponse.message}`
      )
    }
  } catch (error) {
    core.setFailed((error as Error).message)
  }
}

run()
