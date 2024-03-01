import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import { fromEnv } from "@nordicsemiconductor/from-env";
import { connect } from "../device/connect.js";
import { randomUUID } from "node:crypto";

const { stackName } = fromEnv({ stackName: "STACK_NAME" })(process.env);
const ssm = new SSMClient({});
const fetchParameter = async (param: string): Promise<string> => {
  const Name = `/${stackName}/${param}`;
  const v = (
    await ssm.send(
      new GetParameterCommand({
        Name,
      })
    )
  ).Parameter?.Value;
  if (v === undefined) throw new Error(`Parameter ${Name} is not configured!`);
  return v;
};

const [clientId, caCert, privateKey, clientCert, teamId] = (await Promise.all(
  [
    "device/clientId",
    "device/caCert",
    "device/privateKey",
    "device/clientCert",
    "teamId",
  ].map(fetchParameter)
)) as [string, string, string, string, string];

const connectionPromise = connect({
  clientId,
  caCert,
  privateKey,
  clientCert,
  log: console.log,
});

export const handler = async () => {
  const connection = await connectionPromise;
  const topic = `prod/${teamId}/m/d/${clientId}/d2c`;
  const message = {
    id: randomUUID(),
    ts: Date.now(),
    source: "mqtt",
  };
  console.log("mqtt publish", { message, topic });
  await new Promise<void>((resolve, reject) =>
    connection.publish(topic, JSON.stringify(message), (error) => {
      if (error !== undefined) return reject(error);
      return resolve();
    })
  );
  console.log("published", { message, topic });
};
