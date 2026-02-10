## 7. Specific Instructions for AI Collaboration
- **Docker Compose Conventions (CRITICAL):**

  - **Version:** MUST be `3.8`
  - **ALWAYS include:** `restart: unless-stopped` or `restart: always`, persistent volumes
  - **Service naming:** MUST match blueprint folder name exactly
  - **Example:**
    ```yaml
    version: "3.8"
    services:
      ghost:
        image: ghost:6-alpine
        restart: always
        volumes:
          - ghost:/var/lib/ghost/content
    volumes:
      ghost:
    ```

- **template.toml Conventions:**

  - **Variables:** Define in `[variables]` section, use helpers for secrets
  - **Domains:** `[[config.domains]]` with `serviceName`, `port`, `host` (path optional)
  - **Env:** Array of strings: `env = ["KEY=VALUE", "DB_PASSWORD=${db_pass}"]`
  - **Available helpers:** `${domain}`, `${password:length}`, `${base64:length}`, `${hash:length}`, `${uuid}`, `${randomPort}`, `${email}`, `${username}`, `${timestamp}`, `${timestamps:datetime}`, `${timestampms:datetime}`, `${jwt:secret_var:payload_var}`
  - **JWT helper example:** `${jwt:mysecret:mypayload}` with payload containing `exp: ${timestamps:2030-01-01T00:00:00Z}`

- **meta.json Requirements:**

  - **Required fields:** `id`, `name`, `version`, `description`, `links` (with `github`), `logo`, `tags` (array)
  - **Tags:** Lowercase strings (e.g., `["monitoring", "database"]`)
  - **Version:** MUST match Docker image version in docker-compose.yml
  - **Logo:** Filename only (e.g., `"ghost.jpeg"`), file must exist in blueprint folder

