import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";
import { fromEnv } from "@nordicsemiconductor/from-env";
import { MetricUnits, Metrics } from "@aws-lambda-powertools/metrics";

const { stackName } = fromEnv({ stackName: "STACK_NAME" })(process.env);

const teamId = (
  await new SSMClient({}).send(
    new GetParameterCommand({
      Name: `/${stackName}/teamId`,
    })
  )
).Parameter?.Value;

const metricsMQTT = new Metrics({
  namespace: "message-routing-test",
  serviceName: "mqtt",
});

const metricsCOAP = new Metrics({
  namespace: "message-routing-test",
  serviceName: "coap",
});

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  console.log(JSON.stringify({ event }));
  if (teamId === undefined)
    return {
      statusCode: 500,
      body: "No team ID configured.",
    };

  const { messages } = JSON.parse(event.body ?? "{}") as {
    type: string;
    messages: {
      teamId: string;
      deviceId: string;
      messageId: string;
      receivedAt: string;
      topic: string;
      message: {
        id: string;
        ts: number;
        source: "mqtt" | "coap";
      };
    }[];
    timestamp: string;
  };

  for (const {
    message: { id, ts, source },
  } of messages) {
    const delta = Date.now() - ts;
    console.log(JSON.stringify({ id, delta }));
    (source === "mqtt" ? metricsMQTT : metricsCOAP).addMetric(
      `receivingMessageDuration`,
      MetricUnits.Milliseconds,
      delta
    );
  }

  metricsMQTT.publishStoredMetrics();
  metricsCOAP.publishStoredMetrics();

  return {
    statusCode: 201,
    headers: {
      "x-nrfcloud-team-id": teamId,
    },
  };
};
