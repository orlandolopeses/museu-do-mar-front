import { randomBytes } from "node:crypto";

const size = Number(process.argv[2] ?? 32);

if (!Number.isInteger(size) || size < 16) {
  console.error("Informe um tamanho inteiro maior ou igual a 16 bytes.");
  process.exit(1);
}

console.log(randomBytes(size).toString("base64"));
