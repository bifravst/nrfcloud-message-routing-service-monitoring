import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import { connect } from "./device/connect.ts";

const stackName =
  process.env.STACK_NAME ?? "nrfcloud-message-routing-service-monitoring";
const ssm = new SSMClient({});
const fetchParameter = async (param: string): Promise<string> => {
  const Name = `/${stackName}/${param}`;
  const v = (
    await ssm.send(
      new GetParameterCommand({
        Name,
      }),
    )
  ).Parameter?.Value;
  if (v === undefined) throw new Error(`Parameter ${Name} is not configured!`);
  return v;
};

const [clientId, caCert, privateKey, clientCert] = (await Promise.all(
  [
    "device/clientId",
    "device/caCert",
    "device/privateKey",
    "device/clientCert",
  ].map(fetchParameter),
)) as [string, string, string, string];

console.log({ clientId });

const connection = await connect({
  clientId,
  clientCert,
  caCert,
  privateKey,
  log: console.log,
});

connection.end();
