/**
 * Query Gemini models visible to the current API key and print the subset
 * that matches Google's published free-tier model families.
 *
 * Usage:
 *   node scripts/list_google_free_models.mjs
 *   node scripts/list_google_free_models.mjs --json
 *
 * Requires:
 *   GEMINI_API_KEY in the environment.
 */

const FREE_TIER_MODEL_PREFIXES = [
  "gemini-3.1-pro-preview",
  "gemini-3.1-flash-preview",
  "gemini-3.1-flash-lite-preview",
  "gemini-3.1-flash-image-preview",
  "gemini-3-pro-image-preview",
  "gemini-2.5-pro",
  "gemini-2.5-pro-tts",
  "gemini-2.5-flash",
  "gemini-2.5-flash-preview",
  "gemini-2.5-flash-image-preview",
  "gemini-2.5-flash-tts",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash-lite-preview",
  "gemini-2.0-flash",
  "gemini-2.0-flash-image",
  "gemini-2.0-flash-lite",
  "gemini-embedding",
];

function canonicalModelId(name) {
  return String(name || "").replace(/^models\//, "");
}

function matchesFreeTier(modelId) {
  return FREE_TIER_MODEL_PREFIXES.some(
    (prefix) => modelId === prefix || modelId.startsWith(`${prefix}-`),
  );
}

function extractSupportedActions(model) {
  if (Array.isArray(model.supportedActions)) {
    return model.supportedActions.map(String);
  }

  if (Array.isArray(model.supportedGenerationMethods)) {
    return model.supportedGenerationMethods.map(String);
  }

  return [];
}

async function listModels(apiKey) {
  const models = [];
  let pageToken = "";

  while (true) {
    const url = new URL(
      "https://generativelanguage.googleapis.com/v1beta/models",
    );
    url.searchParams.set("key", apiKey);
    url.searchParams.set("pageSize", "100");
    if (pageToken) {
      url.searchParams.set("pageToken", pageToken);
    }

    const response = await fetch(url);
    const payload = await response.json();

    if (!response.ok) {
      const detail = payload?.error?.message || `HTTP ${response.status}`;
      throw new Error(detail);
    }

    if (Array.isArray(payload.models)) {
      models.push(...payload.models);
    }

    if (!payload.nextPageToken) {
      break;
    }

    pageToken = payload.nextPageToken;
  }

  return models;
}

async function main() {
  const apiKey = "AIzaSyBLjd_PsGylgnTBrnDSFGFAIqh5xZWWNYI";
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set.");
    process.exit(1);
  }

  const asJson = process.argv.includes("--json");
  const models = await listModels(apiKey);

  const freeModels = models
    .map((model) => {
      const modelId = canonicalModelId(model.name);
      return {
        name: model.name,
        model_id: modelId,
        display_name: model.displayName ?? null,
        description: model.description ?? null,
        input_token_limit: model.inputTokenLimit ?? null,
        output_token_limit: model.outputTokenLimit ?? null,
        supported_actions: extractSupportedActions(model),
      };
    })
    .filter((model) => model.model_id && matchesFreeTier(model.model_id))
    .sort((left, right) => left.model_id.localeCompare(right.model_id));

  if (asJson) {
    console.log(JSON.stringify(freeModels, null, 2));
    return;
  }

  if (freeModels.length === 0) {
    console.log(
      "No free-tier Gemini models were returned for the current API key.",
    );
    return;
  }

  console.log("Free-tier Gemini models visible to the current API key:\n");
  for (const model of freeModels) {
    const actions = model.supported_actions.join(", ") || "unknown";
    console.log(`- ${model.model_id}`);
    console.log(`  name: ${model.name}`);
    if (model.display_name) {
      console.log(`  display_name: ${model.display_name}`);
    }
    if (model.input_token_limit !== null) {
      console.log(`  input_token_limit: ${model.input_token_limit}`);
    }
    if (model.output_token_limit !== null) {
      console.log(`  output_token_limit: ${model.output_token_limit}`);
    }
    console.log(`  supported_actions: ${actions}`);
  }
}

main().catch((error) => {
  console.error(`Failed to query Gemini models: ${error.message}`);
  process.exit(1);
});
