import bcrypt from "bcryptjs";

const password = process.argv[2] ?? process.env.ADMIN_PASSWORD;

if (!password) {
  console.error("Informe a senha como argumento: node scripts/hash-password.mjs 'minha-senha'");
  process.exit(1);
}

const saltRounds = 10;
const hash = await bcrypt.hash(password, saltRounds);
console.log(hash);
