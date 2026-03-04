# Quick Docker Database Setup - 5 Minutes

The Neon database authentication is failing (error 28000). The fastest solution is to use a local Docker PostgreSQL database.

## Step 1: Start Docker PostgreSQL (1 minute)

```bash
docker run -d \
  --name chanuka-test-db \
  -e POSTGRES_DB=chanuka_test \
  -e POSTGRES_USER=test \
  -e POSTGRES_PASSWORD=test \
  -p 5432:5432 \
  postgres:15
```

## Step 2: Update .env File (1 minute)

Add or update this line in your `.env` file:

```bash
TEST_DATABASE_URL=postgresql://test:test@localhost:5432/chanuka_test
```

## Step 3: Run Tests (1 minute)

```bash
npx vitest run server/features/bills/__tests__/bill-service.integration.test.ts
```

## Expected Result

Tests should run without authentication errors. You'll see actual test results instead of error 28000.

---

## If Docker Isn't Installed

### Windows
Download from: https://www.docker.com/products/docker-desktop/

### Mac
```bash
brew install --cask docker
```

### Linux
```bash
sudo apt-get install docker.io
sudo systemctl start docker
```

---

## To Stop/Remove the Database Later

```bash
# Stop the container
docker stop chanuka-test-db

# Remove the container
docker rm chanuka-test-db
```

---

## Why This is Better Than Neon for Tests

1. **No authentication issues** - Full control over credentials
2. **Faster** - Local database, no network latency
3. **No suspensions** - Always available
4. **Easy reset** - Just restart the container
5. **Isolated** - Won't affect production data

---

**Time Required:** 5 minutes  
**Difficulty:** Easy  
**Reliability:** High
