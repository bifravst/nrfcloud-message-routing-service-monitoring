import {
  App,
  CfnOutput,
  aws_lambda as Lambda,
  Stack,
  Duration,
  aws_events_targets as EventTargets,
  aws_events as Events,
  aws_iam as IAM,
} from "aws-cdk-lib";
import type { MonitoringLambdas } from "./lambdas/MonitoringLambdas";
import type { PackedLayer } from "./lambdas/packLayer";
import { LambdaSource } from "./lambdas/LambdaSource";
import { LambdaLogGroup } from "./LambdaLogGroup";

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
    }
  ) {
    super(parent, id);

    const baseLayer = new Lambda.LayerVersion(this, "baseLayer", {
      layerVersionName: `${Stack.of(this).stackName}-baseLayer`,
      code: new LambdaSource(this, {
        id: "baseLayer",
        zipFile: layer.layerZipFile,
        hash: layer.hash,
      }).code,
      compatibleArchitectures: [Lambda.Architecture.ARM_64],
      compatibleRuntimes: [Lambda.Runtime.NODEJS_20_X],
    });

    const ssmReadPolicy = new IAM.PolicyStatement({
      effect: IAM.Effect.ALLOW,
      actions: ["ssm:GetParameter"],
      resources: [
        `arn:aws:ssm:${Stack.of(this).region}:${
          Stack.of(this).account
        }:parameter/${Stack.of(this).stackName}/*`,
      ],
    });

    const sendFn = new Lambda.Function(this, "sendFn", {
      handler: lambdaSources.send.handler,
      architecture: Lambda.Architecture.ARM_64,
      runtime: Lambda.Runtime.NODEJS_20_X,
      timeout: Duration.seconds(10),
      memorySize: 1792,
      code: new LambdaSource(this, lambdaSources.send).code,
      description: "Publish an MQTT message",
      environment: {
        NODE_NO_WARNINGS: "1",
        STACK_NAME: Stack.of(this).stackName,
      },
      layers: [baseLayer],
      initialPolicy: [ssmReadPolicy],
      ...new LambdaLogGroup(this, "sendFnLogs"),
    });

    const scheduler = new Events.Rule(this, "scheduler", {
      description: `Scheduler to health check mqtt bridge`,
      schedule: Events.Schedule.rate(Duration.minutes(1)),
    });
    scheduler.addTarget(new EventTargets.LambdaFunction(sendFn));

    const receiveFn = new Lambda.Function(this, "receiveFn", {
      handler: lambdaSources.receive.handler,
      architecture: Lambda.Architecture.ARM_64,
      runtime: Lambda.Runtime.NODEJS_20_X,
      timeout: Duration.seconds(5),
      memorySize: 1792,
      code: Lambda.Code.fromAsset(lambdaSources.receive.zipFile),
      description: "Receive webhooks",
      layers: [baseLayer],
      environment: {
        NODE_NO_WARNINGS: "1",
        STACK_NAME: Stack.of(this).stackName,
      },
      ...new LambdaLogGroup(this, "receiveFnLogs"),
      initialPolicy: [ssmReadPolicy],
    });
    const receiveFnURL = receiveFn.addFunctionUrl({
      authType: Lambda.FunctionUrlAuthType.NONE,
    });

    new CfnOutput(this, "receiveFnURL", {
      exportName: `${this.stackName}:receiveFnURL`,
      description: "The Webhook receiver URL",
      value: receiveFnURL.url,
    });
  }
}
