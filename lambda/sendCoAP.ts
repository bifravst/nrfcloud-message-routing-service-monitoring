import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";
import { fromEnv } from "@nordicsemiconductor/from-env";
import { randomUUID } from "node:crypto";

const { stackName, coapLambda } = fromEnv({
  stackName: "STACK_NAME",
  coapLambda: "COAP_LAMBDA",
})(process.env);
const ssm = new SSMClient({});
const lambda = new LambdaClient({});
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

const [deviceId, privateKey] = (await Promise.all(
  ["device/clientId", "device/privateKey"].map(fetchParameter),
)) as [string, string];

export const handler = async () => {
  const messageId = randomUUID();
  console.log("coap publish", { messageId, deviceId });
  const { Payload, FunctionError } = await lambda.send(
    new InvokeCommand({
      FunctionName: coapLambda,
      Payload: Buffer.from(
        JSON.stringify({
          deviceId,
          privateKey,
          messageId,
        }),
      ),
    }),
  );
  const result = JSON.parse(new TextDecoder().decode(Payload));
  if (FunctionError !== undefined || result.statusCode !== 200) {
    console.error("CoAP client error", { FunctionError, result });
    throw new Error(`CoAP client error`);
  }
  console.log("published", { message: result.message });
};
