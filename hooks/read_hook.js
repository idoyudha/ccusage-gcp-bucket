async function main() {
    const chunks = [];
    for await (const chunk of process.stdin) {
        chunks.push(chunk);
    }
    const toolArgs = JSON.parse(Buffer.concat(chunks).toString());

    // readPath is the path to the file that Claude is trying to read
    const readPath = toolArgs.tool_input?.file_path || toolArgs.tool_input?.path || "";

    // ensure Claude is not trying to read the .env file
    if (readPath.endsWith(".env") || readPath.includes("/.env")) {
        console.error("You cannot read the .env file");
        process.exit(2);
    }

    // ensure Claude is not trying to read service account keys
    if (readPath.includes("/service-account-key.json")) {
        console.error("You cannot read service account keys");
        process.exit(2);
    }
}

main()