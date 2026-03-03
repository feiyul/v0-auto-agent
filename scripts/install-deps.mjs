import { execSync } from "child_process"

console.log("Running pnpm install to sync lockfile...")
try {
  const output = execSync("cd /vercel/share/v0-project && pnpm install", { encoding: "utf8" })
  console.log(output)
  console.log("pnpm install completed successfully")
} catch (err) {
  console.error("Error:", err.message)
  console.error(err.stdout)
  console.error(err.stderr)
}
