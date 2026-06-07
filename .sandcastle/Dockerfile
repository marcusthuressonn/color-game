FROM node:22-bookworm

# Install system dependencies
RUN apt-get update && apt-get install -y \
  git \
  curl \
  jq \
  && rm -rf /var/lib/apt/lists/*

# Install GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
  | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg \
  && echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
  | tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
  && apt-get update && apt-get install -y gh \
  && rm -rf /var/lib/apt/lists/*

# Corepack normally prompts before downloading a package manager binary. There's
# no TTY in the sandbox, so the prompt aborts `pnpm install` with exit 1 — disable
# it so Corepack fetches the pinned pnpm silently if it ever needs to.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0

# Mark the environment as CI: keeps package-manager output non-interactive and
# makes the project's `prepare` script skip simple-git-hooks installation, which
# isn't wanted inside the sandbox.
ENV CI=true

# Use a shared, world-readable Corepack cache so the binary we pre-fetch here as
# root is reused at runtime by the (unprivileged) agent user — otherwise Corepack
# would re-download into the agent's home on first `pnpm install`.
ENV COREPACK_HOME=/opt/corepack

# Enable Corepack and pre-fetch the pinned pnpm version at build time so the
# runtime `pnpm install` hook needs no network round-trip. Keep this version in
# sync with the "packageManager" field in package.json.
RUN corepack enable \
  && corepack prepare pnpm@10.32.1 --activate \
  && chmod -R a+rX "$COREPACK_HOME"

# Build-args for UID/GID alignment: sandcastle docker build-image
# defaults these to the host user's UID/GID so image-built files
# and bind-mounted files share an owner without runtime chown.
ARG AGENT_UID=1000
ARG AGENT_GID=1000

# Rename the base image's "node" user to "agent" and align UID/GID.
# If AGENT_GID collides with an existing group (e.g. macOS GID 20 = Debian
# "dialout"), attach the renamed user to that pre-existing group instead of
# recreating it.
RUN if getent group "$AGENT_GID" >/dev/null; then \
  EXISTING=$(getent group "$AGENT_GID" | cut -d: -f1); \
  usermod -u "$AGENT_UID" -g "$EXISTING" -d /home/agent -m -l agent node; \
  else \
  groupmod -g "$AGENT_GID" node && \
  usermod -u "$AGENT_UID" -g "$AGENT_GID" -d /home/agent -m -l agent node; \
  fi
USER ${AGENT_UID}:${AGENT_GID}

# Install Claude Code CLI
RUN curl -fsSL https://claude.ai/install.sh | bash

# Add Claude to PATH
ENV PATH="/home/agent/.local/bin:$PATH"

WORKDIR /home/agent

# In worktree sandbox mode, Sandcastle bind-mounts the git worktree at /home/agent/workspace
# and overrides the working directory to /home/agent/workspace at container start.
# Structure your Dockerfile so that /home/agent/workspace can serve as the project root.
ENTRYPOINT ["sleep", "infinity"]
