import fs from "node:fs/promises";
import { connect } from "./device/connect";

const { clientId, clientCert, caCert, privateKey } = JSON.parse(
  await fs.readFile(process.argv[process.argv.length - 1] as string, "utf-8")
);

const connection = await connect({
  clientId,
  clientCert,
  caCert,
  privateKey,
  log: console.log,
});

connection.end();
