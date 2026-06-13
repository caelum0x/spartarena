# SpartArena — Production Integration Facts (VERIFIED 2026-06-12)

Replace ALL mock/placeholder data paths with these REAL connections. Mocks may only
remain behind an explicit opt-in flag (e.g. `LLM_PROVIDER=mock`, `USE_MOCKS=true`),
never as the default. Validate every external response with zod. Handle errors,
timeouts, retries (exponential backoff), and rate limits. No hardcoded secrets — all
keys via env. No `any`.

## 1. LLM providers (real)
Default selection in getProvider(): if `ANTHROPIC_API_KEY` set → Anthropic; else if `OPENAI_API_KEY` → OpenAI; else if `LLM_PROVIDER=mock` → mock (tests only); else throw a clear config error.

### Anthropic Messages API
- POST `https://api.anthropic.com/v1/messages`
- Headers: `x-api-key: $ANTHROPIC_API_KEY`, `anthropic-version: 2023-06-01`, `content-type: application/json`
- Body: `{ model, max_tokens, system, messages:[{role:"user",content}], temperature }`
- Default model: `claude-opus-4-8` (configurable via `ANTHROPIC_MODEL`; latest Claude). Response text at `content[0].text`.
- For structured output, instruct the model to return ONLY JSON and parse+zod-validate; retry once on parse failure with a "return valid JSON only" nudge.

### OpenAI Chat Completions API
- POST `https://api.openai.com/v1/chat/completions`
- Headers: `Authorization: Bearer $OPENAI_API_KEY`, `content-type: application/json`
- Body: `{ model, messages:[{role:"system"},{role:"user"}], temperature, response_format:{type:"json_object"} }`
- Default model: `gpt-4o` (configurable via `OPENAI_MODEL`). Response at `choices[0].message.content`.

Use native fetch (Node 24). Implement timeout via AbortController. Keep an LlmProvider interface; add `completeJson<T>(system, user, schema)` that returns validated JSON.

## 2. Mantle chain (real)
- MAINNET: chainId **5000**, RPC `https://rpc.mantle.xyz`, WSS `wss://wss.mantle.xyz`, explorer `https://mantlescan.xyz`.
- SEPOLIA: chainId **5003**, RPC `https://rpc.sepolia.mantle.xyz`, explorer `https://sepolia.mantlescan.xyz`.
- Explorer API (Etherscan V2, one key all chains): `https://api.etherscan.io/v2/api?chainid=5000` (or 5003). Key via `ETHERSCAN_API_KEY`. Free tier 5 req/s.
  - Wallet ERC-20 transfers: `?chainid=5000&module=account&action=tokentx&address=0x..&page=1&offset=50&sort=desc&apikey=KEY`. Rows: `from,to,value,tokenSymbol,tokenDecimal,contractAddress,blockNumber,timeStamp,hash`.
  - Normal txs: `action=txlist`. Internal: `action=txlistinternal`.
- viem getLogs Transfer: event `Transfer(address indexed from,address indexed to,uint256 value)`, topic0 `0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef`. Filter via viem `args:{to}` or `{from}`. CHUNK ranges to ~2000 blocks, backoff on 429/range errors.

### Mantle MAINNET token addresses (checksummed; read decimals() at runtime)
- WMNT `0x78c1b0C915c4FAA5FffA6CAbf0219DA63d7f4cb8` (18)
- mETH `0xcDA86A272531e8640cD7F1a92c01839911B90bb0` (18)
- USDY `0x5bE26527e817998A7206475496fDE1E68957c5A6` (18)
- USDT `0x201EBa5CC46D216Ce6DC03F6a759e8E766e956aE` (6)
- USDC `0x09Bc4E0D864854c6aFB6eB9A9cdF58aC190D0dF9` (6)
Testnet token addresses are NOT canonical — resolve dynamically or skip on testnet.

Real anomaly detection: pull a wallet's recent token transfers (explorer tokentx) + native balance (viem getBalance), compute baseline (median/mean of recent transfer values) and flag outliers (e.g. transfer >> Nx median, transfers to freshly-created contracts via getCode/age). No hardcoded transfers.

## 3. Market + yield data (real, no key for DefiLlama)
- CoinGecko price: `https://api.coingecko.com/api/v3/simple/price?ids=mantle,mantle-staked-ether,ondo-us-dollar-yield,tether,usd-coin&vs_currencies=usd&include_24hr_change=true`. Optional demo key header `x-cg-demo-api-key` (env `COINGECKO_API_KEY`). Fields: `[id].usd`, `[id].usd_24h_change`. IDs: MNT=`mantle`, mETH=`mantle-staked-ether`, USDY=`ondo-us-dollar-yield`, USDT=`tether`, USDC=`usd-coin`.
- DefiLlama yields: `https://yields.llama.fi/pools` → `{status,data:[...]}`; filter `chain==="Mantle"`. Fields: `project,symbol,tvlUsd,apy,apyBase,apyReward,pool,stablecoin,ilRisk,apyMean30d`. (~10MB, fetch server-side, cache.)
  - Pool APY history: `https://yields.llama.fi/chart/{poolUUID}`.
- DefiLlama price: `https://coins.llama.fi/prices/current/mantle:0xADDRESS` (comma-separate). mETH canonical price is on Ethereum L1: `ethereum:0xd5F7838F5C461fefF7FE49ea5ebaF7728bB0ADfa`. MNT via `coingecko:mantle`.
- USDY APY: DefiLlama pool `b5d7a190-38d2-4fdd-8c14-1fd00c11bce1` (`apyBase`). mETH staking APR: DefiLlama pool `b9f2f00a-ba96-4589-a171-dde979a23d87`.

## 4. Byreal (real REST — it's a SOLANA DEX, read/quote only here)
- Base URL `https://api2.byreal.io` (env `BYREAL_API_URL`, default this). No auth for reads/quotes.
- Pools list: `GET /byreal/api/dex/v2/pools/info/list?sortField=tvl&sortType=desc&page=1&pageSize=20` → PageResult of SimplePoolInfo (fields: poolAddress,mintA,mintB,feeRate,price,tvl,volumeUsd24h,feeApr24h,...; money values are STRINGS).
- Pool detail: `GET /byreal/api/dex/v2/pools/details?poolAddress=...`
- Token list/discovery: `GET /byreal/api/dex/v2/mint/list?sortField=volumeUsd24h&searchKey=...`; hot: `/mint/hot`; price: `/mint/price?mints=...`.
- Swap quote (preview, NO wallet needed — omit userPublicKey): `POST /byreal/api/router/v1/router-service/swap` body `{inputMint,outputMint,amount,swapMode:"in",slippageBps:"50"}` → `{result:{retCode,retMsg},inAmount,outAmount,otherAmountThreshold,priceImpactPct,poolAddresses,routerType}`.
- Mints are Solana base58 addresses (e.g. SOL `So111...112`, USDC `EPjFW...Dt1v`). Keep the adapter's typed interface; implement a real `ByrealRestClient`. A `MockByrealAdapter` may remain ONLY behind `BYREAL_MOCK=true`.
- Official npm (optional, for CLI/SDK path): `@byreal-io/byreal-cli`, CLMM SDK `byreal-git/byreal-clmm-sdk`. Note in README that live LP execution is Solana-side and out of MVP scope; reads/quotes are wired for real.

## 5. Notifications (real)
- Telegram: `POST https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/sendMessage` body `{chat_id,text,parse_mode:"Markdown"}`. No-op (log warn) if token unset.
- Discord: `POST $DISCORD_WEBHOOK_URL` body `{content}`. No-op if unset.

## 6. Backend / DB (real)
- Real PostgreSQL via Prisma (DATABASE_URL). Real viem public+wallet clients for reads/writes. Indexer polls real contract logs (getLogs from a stored cursor block) and upserts into Postgres — no simulated events. Execution module runs the real agent-runner pipeline (or invokes its agents) against real data, hashes, and writes on-chain with the backend signer.

## Rules
- Default code path = real. Mocks gated behind explicit env flags only, clearly labeled.
- Zod-validate all external JSON. Timeouts + retries + rate-limit handling.
- Update each touched package's `.env.example` with the new vars (ANTHROPIC_API_KEY, OPENAI_API_KEY, ANTHROPIC_MODEL, OPENAI_MODEL, ETHERSCAN_API_KEY, COINGECKO_API_KEY, BYREAL_API_URL, TELEGRAM_*, DISCORD_WEBHOOK_URL).
- Must typecheck. Keep AlphaSentinel + YieldStrategist runnable end-to-end against REAL data (offline mock only when keys absent AND flag set).
