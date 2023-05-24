# Healthcheck-event for Github Actions

Send events to your resources in Healthcheck. Events will be visualized in metric graphs.

## Usage

Set up your resource in Healthcheck. On your resource page hit the ```Configure events``` button and add your repository URLs (e.g. https://github.com/elisa-actions/healthcheck-event) to allow the repository to send events to the resource.

Healthcheck uses Github identity tokens for access control. You need to have the following permissions set in your workflow/job

```yaml
    permissions:
      id-token: write
      contents: read
```

The action takes a resource id, type of deployment or incident, and a message related to the event as input. Resource id is filled automatically if you select `Copy actions step` from Healthcheck.

```yaml
    - name: Send event info to Healthcheck
      uses: elisa-actions/healthcheck-event@v1
      with:
        resourceid: <id number of your resource>
        type: deployment/incident
        message: <any text>
```
