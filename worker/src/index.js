const REQUIRED_FILES = ['characters', 'chapters', 'worldbuilding', 'notes', 'timeline'];

export default {
  async fetch(request, env) {
    const corsHeaders = buildCorsHeaders(env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      validateEnv(env);

      const url = new URL(request.url);
      if (url.pathname !== '/planner') {
        return jsonResponse({ error: 'Not found' }, 404, corsHeaders);
      }

      if (request.method === 'GET') {
        const files = await readPlannerFiles(env, REQUIRED_FILES);
        const updatedAt = Math.max(0, ...Object.values(files).map((value) => Number(value.updatedAt) || 0));
        return jsonResponse({ files, updatedAt }, 200, corsHeaders);
      }

      if (request.method === 'POST') {
        const body = await request.json();
        const normalizedFiles = normalizeIncomingFiles(body?.files || {});

        await writePlannerFiles(env, normalizedFiles);
        const updatedAt = Date.now();
        return jsonResponse({ ok: true, updatedAt, files: normalizedFiles }, 200, corsHeaders);
      }

      return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
    } catch (error) {
      return jsonResponse({ error: error.message || 'Unexpected error' }, 500, corsHeaders);
    }
  }
};

function validateEnv(env) {
  if (!env.GITHUB_TOKEN || !env.GITHUB_OWNER || !env.GITHUB_REPO) {
    throw new Error('Missing required Worker secrets/config: GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO');
  }
}

function buildCorsHeaders(env) {
  const allowedOrigin = env.ALLOWED_ORIGIN || '*';
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8'
  };
}

function jsonResponse(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers
  });
}

function normalizeIncomingFiles(inputFiles) {
  const output = {};

  for (const [key, rawValue] of Object.entries(inputFiles)) {
    if (!isSafeFileKey(key)) {
      throw new Error(`Invalid file key: ${key}`);
    }

    const content = typeof rawValue?.content === 'string' ? rawValue.content : '';
    const updatedAt = Number(rawValue?.updatedAt) || Date.now();
    output[key] = { content, updatedAt };
  }

  for (const fileKey of REQUIRED_FILES) {
    if (!output[fileKey]) {
      output[fileKey] = { content: '', updatedAt: 0 };
    }
  }

  return output;
}

function isSafeFileKey(value) {
  return /^[a-zA-Z0-9_-]+$/.test(value);
}

async function readPlannerFiles(env, keys) {
  const files = {};

  for (const key of keys) {
    const path = buildDataPath(env, key);
    const githubFile = await githubReadFile(env, path);

    if (!githubFile) {
      files[key] = { content: '', updatedAt: 0 };
      continue;
    }

    try {
      const decoded = decodeBase64(githubFile.content || '');
      const parsed = JSON.parse(decoded);
      files[key] = {
        content: typeof parsed.content === 'string' ? parsed.content : '',
        updatedAt: Number(parsed.updatedAt) || 0
      };
    } catch {
      files[key] = { content: '', updatedAt: 0 };
    }
  }

  return files;
}

async function writePlannerFiles(env, files) {
  for (const [key, value] of Object.entries(files)) {
    const path = buildDataPath(env, key);
    const existingFile = await githubReadFile(env, path);
    const sha = existingFile?.sha;

    await githubWriteFile(env, {
      path,
      sha,
      content: JSON.stringify(value, null, 2),
      message: `Update ${key}.json`
    });
  }
}

function buildDataPath(env, key) {
  const dataDir = env.GITHUB_DATA_DIR || 'planner-data';
  return `${dataDir}/${key}.json`;
}

async function githubReadFile(env, path) {
  const response = await fetch(githubContentsUrl(env, path), {
    method: 'GET',
    headers: githubHeaders(env)
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub read failed for ${path}: ${response.status} ${text}`);
  }

  return response.json();
}

async function githubWriteFile(env, { path, sha, content, message }) {
  const body = {
    message,
    content: encodeBase64(content),
    branch: env.GITHUB_BRANCH || 'main'
  };

  if (sha) {
    body.sha = sha;
  }

  const response = await fetch(githubContentsUrl(env, path), {
    method: 'PUT',
    headers: githubHeaders(env),
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub write failed for ${path}: ${response.status} ${text}`);
  }

  return response.json();
}

function githubContentsUrl(env, path) {
  const safePath = path.split('/').map(encodeURIComponent).join('/');
  const branch = encodeURIComponent(env.GITHUB_BRANCH || 'main');
  return `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${safePath}?ref=${branch}`;
}

function githubHeaders(env) {
  return {
    Authorization: 'Bearer ' + env.GITHUB_TOKEN,
    Accept: 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'User-Agent': 'book-planner-worker'
  };
}

function encodeBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function decodeBase64(value) {
  const binary = atob(value.replace(/\n/g, ''));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}
