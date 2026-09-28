import {
  App,
  CfnOutput,
  aws_lambda as Lambda,
  Stack,
  Duration,
  aws_events_targets as EventTargets,
  aws_events as Events,
} from "aws-cdk-lib";
import type { MonitoringLambdas } from "./lambdas/MonitoringLambdas.ts";
import type { PackedLayer } from "@bifravst/aws-cdk-lambda-helpers/layer";
import {
  PackedLambdaFn,
  BaseLayerVersion,
} from "@bifravst/aws-cdk-lambda-helpers/cdk";

export class MonitoringStack extends Stack {
  public constructor(
    parent: App,
    id: string,
    {
      lambdaSources,
      layer,
    }: {
      lambdaSources: MonitoringLambdas;
      layer: PackedLayer;
    },
  ) {
    super(parent, id);

    const baseLayerVersion = new BaseLayerVersion(this, layer);

    const sendFn = new PackedLambdaFn(this, "sendFn", lambdaSources.send, {
      timeout: Duration.seconds(10),
      memorySize: 1792,
      description: "Publish an MQTT message",
      layers: [baseLayerVersion.layerVersion],
    });

    const scheduler = new Events.Rule(this, "scheduler", {
      description: `Scheduler to health check mqtt bridge`,
      schedule: Events.Schedule.rate(Duration.minutes(1)),
    });
    scheduler.addTarget(new EventTargets.LambdaFunction(sendFn.fn));

    const coapClientFn = new PackedLambdaFn(
      this,
      "coapClientFn",
      lambdaSources.coapClient,
      {
        runtime: Lambda.Runtime.PROVIDED_AL2023,
        timeout: Duration.seconds(30),
        description: "Sends a JSON message to the nRF Cloud CoAP server",
        environment: {},
      },
    );

    const sendCoAPFn = new PackedLambdaFn(
      this,
      "sendCoAPFn",
      lambdaSources.sendCoAP,
      {
        timeout: Duration.seconds(30),
        memorySize: 1792,
        description: "Publish a CoAP message",
        environment: {
          COAP_LAMBDA: coapClientFn.fn.functionName,
        },
        layers: [baseLayerVersion.layerVersion],
      },
    );
    coapClientFn.fn.grantInvoke(sendCoAPFn.fn);

    const coapScheduler = new Events.Rule(this, "coapScheduler", {
      description: `Scheduler to health check CoAP`,
      schedule: Events.Schedule.rate(Duration.minutes(1)),
    });
    coapScheduler.addTarget(new EventTargets.LambdaFunction(sendCoAPFn.fn));

    const receiveFn = new PackedLambdaFn(
      this,
      "receiveFn",
      lambdaSources.receive,
      {
        timeout: Duration.minutes(15),
        memorySize: 1792,
        description: "Receive webhooks",
        layers: [baseLayerVersion.layerVersion],
      },
    );
    const receiveFnURL = receiveFn.fn.addFunctionUrl({
      authType: Lambda.FunctionUrlAuthType.NONE,
    });

    new CfnOutput(this, "receiveFnURL", {
      exportName: `${this.stackName}:receiveFnURL`,
      description: "The Webhook receiver URL",
      value: receiveFnURL.url,
    });
  }
}
