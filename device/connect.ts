import mqtt from "mqtt";

export const connect = async ({
  clientId,
  clientCert,
  caCert,
  privateKey,
  log,
}: {
  clientId: string;
  clientCert: string;
  caCert: string;
  privateKey: string;
  log?: (...args: any[]) => void;
}): Promise<mqtt.MqttClient> =>
  new Promise<mqtt.MqttClient>((resolve, reject) => {
    const mqttClient = mqtt.connect({
      host: "mqtt.nrfcloud.com",
      port: 8883,
      protocol: "mqtts",
      protocolVersion: 4,
      clean: true,
      clientId,
      key: privateKey,
      cert: clientCert,
      ca: caCert,
      connectTimeout: 5000,
    });

    mqttClient
      .on("connect", () => {
        log?.(`Connected`);
        resolve(mqttClient);
      })
      .on("error", (error) => {
        log?.(`mqtt error`, { error });
        reject(error);
      })
      .on("reconnect", () => {
        log?.(`mqtt reconnect`);
      });
  });
