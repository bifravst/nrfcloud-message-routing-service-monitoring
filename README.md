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
CERTS_DIR="./certificates"
DAYS_VALID=10950                       # default device cert validity (~30 years)

mkdir -p "$CERTS_DIR"

CA_ID="${CA_ID:-$(uuidgen)}"
if [ ! -f "$CERTS_DIR/$CA_ID.pem" ]; then
  openssl genrsa -out "$CERTS_DIR/$CA_ID.key" 2048
  openssl req -x509 -new -nodes -key "$CERTS_DIR/$CA_ID.key" -sha256 \
    -days 356 -out "$CERTS_DIR/$CA_ID.pem" -subj "/OU=my-stack"
  echo -n "$CA_ID" > "$CERTS_DIR/currentCA"
fi

# --- 1. Device private key (EC P-256)
openssl ecparam -out "$CERTS_DIR/device-$DEVICE_ID.key" -name prime256v1 -genkey

# --- 2. CSR with CN = device ID
openssl req -new -key "$CERTS_DIR/device-$DEVICE_ID.key" \
  -out "$CERTS_DIR/device-$DEVICE_ID.csr" -subj "/CN=$DEVICE_ID"

# --- 3. Sign the CSR with the CA
openssl x509 -req -in "$CERTS_DIR/device-$DEVICE_ID.csr" \
  -CAkey "$CERTS_DIR/$CA_ID.key" -CA "$CERTS_DIR/$CA_ID.pem" -CAcreateserial \
  -out "$CERTS_DIR/device-$DEVICE_ID.pem" -days "$DAYS_VALID" -sha256

# --- 4. Bundle: device cert followed by CA cert (needed for JITP)
{ cat "$CERTS_DIR/device-$DEVICE_ID.pem"; echo; cat "$CERTS_DIR/$CA_ID.pem"; } \
  > "$CERTS_DIR/device-$DEVICE_ID.bundle.pem"

# --- 5. Stuff in JSON
jq -n \
  --rawfile certificate "$CERTS_DIR/device-$DEVICE_ID.bundle.pem" \
  '{certificate: ($certificate | if endswith("\n") then . else . + "\n" end)}' \
  > "$CERTS_DIR/device-$DEVICE_ID.json"

echo "Certificate for $DEVICE_ID generated."

# Register
http POST https://api.nrfcloud.com/v1/devices/$DEVICE_ID Authorization:"Bearer $NRFCLOUD_API_KEY" Content-Type:application/json < $CERTS_DIR/device-$DEVICE_ID.json
```

### Store credentials

```bash
aws ssm put-parameter --overwrite --name /nrfcloud-message-routing-service-monitoring/device/clientId --type String --value "$DEVICE_ID"
aws ssm put-parameter --overwrite --name /nrfcloud-message-routing-service-monitoring/device/caCert --type String --value "`cat data/AmazonRootCA1.pem`"
aws ssm put-parameter --overwrite --name /nrfcloud-message-routing-service-monitoring/device/privateKey --type String --value "`cat $CERTS_DIR/device-$DEVICE_ID.key`"
aws ssm put-parameter --overwrite --name /nrfcloud-message-routing-service-monitoring/device/clientCert --type String --value "`cat $CERTS_DIR/device-$DEVICE_ID.bundle.pem`"
```

### Connect

```bash
node --experimental-transform-types --no-warnings connect.ts
# Connected
```

## Invoke the send lambda

The send lambda is invoked every minute by a scheduler. To trigger it manually
(for example after storing the device credentials), look up its function name
and invoke it:

```bash
SEND_FN=`aws cloudformation describe-stack-resources --stack-name nrfcloud-message-routing-service-monitoring --query "StackResources[?ResourceType=='AWS::Lambda::Function' && starts_with(LogicalResourceId, 'sendFn')].PhysicalResourceId | [0]" --output text`

aws lambda invoke --function-name $SEND_FN --log-type Tail --query LogResult --output text /dev/null | base64 -d
# ... mqtt publish { message: { id: '...', ts: ..., source: 'mqtt' }, topic: 'prod/<team ID>/m/d/<device ID>/d2c' }
# ... published { message: { id: '...', ts: ..., source: 'mqtt' }, topic: 'prod/<team ID>/m/d/<device ID>/d2c' }
```

## Verify the destination

Go to the Message Routing dashboard, and verify the destination: get the verification code from the receive lambda logs.
