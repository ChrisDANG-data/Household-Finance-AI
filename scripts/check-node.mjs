const MIN_MAJOR = 20;
const MIN_MINOR = 9;
const [major, minor] = process.versions.node.split(".").map(Number);

if (major < MIN_MAJOR || (major === MIN_MAJOR && minor < MIN_MINOR)) {
  console.error(
    `\nNode.js ${process.versions.node} is too old for this project.\n` +
      `Required: >=${MIN_MAJOR}.${MIN_MINOR}.0 (Next.js 16)\n\n` +
      `Fix (pick one):\n` +
      `  nvm install 20 && nvm use 20    # if using nvm (.nvmrc in repo root)\n` +
      `  fnm install 20 && fnm use 20    # if using fnm\n` +
      `  https://nodejs.org/             # LTS installer\n`,
  );
  process.exit(1);
}
