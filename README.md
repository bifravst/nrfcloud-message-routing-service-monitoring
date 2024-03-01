# Monitor the delivery of messages using nRF Cloud's Message Routing Service

## Setup

```bash
npm ci
npx cdk deploy
```

## Configure team ID

```bash
aws ssm put-parameter --name /nrfcloud-message-routing-service-monitoring/teamId --type String --value <team ID>
```

## Make sure the webhook returns the team ID

```bash
http <receiveFnURL>
# HTTP/1.1 201 Created
# ...
# x-nrfcloud-team-id: ...
```

## Register webhook

```bash
http POST https://message-routing.nrfcloud.com/v2/destination "Authorization: Bearer $NRFCLOUD_API_KEY" <<< '{"name":"Monitoring","isEnabled":true,"config":{"type":"http","url":"<receiveFnURL>","verifySsl":true}}'
```

## Create device

### Credentials

```bash
export DEVICE_ID=`uuidgen`
http POST https://api.nrfcloud.com/v1/devices/$DEVICE_ID/certificates Authorization:"Bearer $NRFCLOUD_API_KEY" Content-Type:text/plain > $DEVICE_ID.json <<< 123456
```

### Connect

```bash
npx tsx connect.ts $DEVICE_ID.json
# Connected
```

### Associate device

```bash
echo -n 123456 | http PUT https://api.nrfcloud.com/v1/association/$DEVICE_ID Authorization:"Bearer $NRFCLOUD_API_KEY" Content-Type:text/plain
# HTTP/1.1 202 Accepted
```

### Store credentials

```bash
aws ssm put-parameter --name /nrfcloud-message-routing-service-monitoring/device/clientId --type String --value "`cat $DEVICE_ID.json | jq -r '.clientId'`"
aws ssm put-parameter --name /nrfcloud-message-routing-service-monitoring/device/caCert --type String --value "`cat $DEVICE_ID.json | jq -r '.caCert'`"
aws ssm put-parameter --name /nrfcloud-message-routing-service-monitoring/device/privateKey --type String --value "`cat $DEVICE_ID.json | jq -r '.privateKey'`"
aws ssm put-parameter --name /nrfcloud-message-routing-service-monitoring/device/clientCert --type String --value "`cat $DEVICE_ID.json | jq -r '.clientCert'`"
```
