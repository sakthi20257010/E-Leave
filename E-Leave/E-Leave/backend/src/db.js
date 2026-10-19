import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

const sslEnabled = process.env.DB_SSL === "true";
const sslCa = process.env.DB_SSL_CA?.replace(/\\n/g, "\n");

if (process.env.NODE_ENV === "production") {
  const required = ["DB_HOST", "DB_USER", "DB_PASSWORD", "DB_NAME"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length) {
    throw new Error(`Missing required production database settings: ${missing.join(", ")}`);
  }
}

export const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "eleave_db",
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT || 15000),
  ...(sslEnabled
    ? {
        ssl: sslCa
          ? { ca: sslCa, rejectUnauthorized: true }
          : { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" },
      }
    : {}),
});
