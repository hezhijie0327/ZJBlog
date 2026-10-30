// Description: Using Cloudflare Workers to map and mirror hezhijie0327's repos.
// ES Modules syntax (the current Workers default; the service-worker
// addEventListener("fetch") syntax has been deprecated by Cloudflare).
// Deployed separately with wrangler, not part of the blog build chain.
//
// Token: reads the GITHUB_TOKEN secret binding (never hardcode it):
//   wrangler secret put GITHUB_TOKEN
// A fine-grained read-only PAT is enough; without a token only public files
// are served (requests go out anonymously - an empty Authorization value
// would break otherwise-anonymous requests, so the header is omitted).

const REPO_OWNER = "hezhijie0327";
const GITHUB_RAW_ORIGIN = "https://raw.githubusercontent.com";

// Path segments that name GitHub UI views rather than real file paths.
const VIEW_SEGMENTS = new Set(["blob", "edit", "raw"]);

// Matches the literal hotlink-whitelist marker anywhere in the path
// (case-insensitive, like the original /\/hotlink-ok\//gim).
const HOTLINK_MARKER = /\/hotlink-ok\//gim;

// Suffix (lowercase, with dot) -> MIME type. `;charset=UTF-8` is appended at
// lookup time for textual types; binary types don't take a charset parameter.
const FILE_EXTENSION_MIME_TYPES = /** @type {{ [key: string]: string }} */ ({
  ".cer": "application/pem-certificate-chain",
  ".cert": "application/pem-certificate-chain",
  ".csr": "application/pem-certificate-chain",
  ".key": "application/pem-certificate-chain",
  ".conf": "text/plain",
  ".dockerfile": "text/plain",
  ".header": "text/plain",
  ".patch": "text/plain",
  ".txt": "text/plain",
  ".css": "text/css",
  ".dat": "application/octet-stream",
  ".eot": "application/vnd.ms-fontobject",
  ".gz": "application/gzip",
  ".html": "text/html",
  ".jpg": "image/jpeg",
  ".js": "text/javascript",
  ".ts": "text/javascript",
  ".tsx": "text/javascript",
  ".json": "application/json",
  ".webmanifest": "application/json",
  ".pfx": "application/pkcs12",
  ".png": "image/png",
  ".py": "text/x-python",
  ".sh": "application/x-sh",
  ".svg": "image/svg+xml",
  ".ttf": "font/ttf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".yaml": "application/yaml",
  ".yml": "application/yaml",
  ".zip": "application/zip",
});

const TEXTUAL_MIME_TYPES = new Set([
  "application/json",
  "application/pem-certificate-chain",
  "application/x-sh",
  "application/yaml",
  "image/svg+xml",
  "text/css",
  "text/html",
  "text/javascript",
  "text/plain",
  "text/x-python",
]);

export default {
  /**
   * @param {Request} request
   * @param {{ GITHUB_TOKEN?: string }} env
   */
  async fetch(request, env) {
    return handleRequest(request, env);
  },
};

/** @param {Request} request @param {{ GITHUB_TOKEN?: string }} env */
async function handleRequest(request, env) {
  const targetPath = resolveTargetPath(new URL(request.url).pathname);
  const upstreamResponse = await fetch(`${GITHUB_RAW_ORIGIN}/${REPO_OWNER}/${targetPath}`, {
    headers: githubAuthHeaders(env),
  });

  if (upstreamResponse.status !== 200) {
    return notFoundResponse();
  }

  const contentType = resolveContentType(targetPath);
  if (contentType) {
    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "content-type": contentType,
      },
    });
  }

  // Unknown extension: pass the upstream headers through, minus encoding
  // markers - the body was already decompressed by fetch().
  const headers = new Headers(upstreamResponse.headers);
  headers.delete("Content-Encoding");
  headers.delete("Content-Length");
  return new Response(upstreamResponse.body, {
    status: upstreamResponse.status,
    headers,
  });
}

// Map the incoming path to the raw.githubusercontent.com path: an explicit
// repo-owner segment is optional, the first GitHub view segment (blob/edit/raw)
// is dropped, and hotlink markers are removed.
/** @param {string} pathname */
function resolveTargetPath(pathname) {
  const pathSegments = pathname.replace(/^\/+/, "").split("/");
  if (pathSegments[0] === REPO_OWNER) {
    pathSegments.shift();
  }
  const viewIndex = pathSegments.findIndex((segment) => VIEW_SEGMENTS.has(segment));
  if (viewIndex !== -1) {
    pathSegments.splice(viewIndex, 1);
  }
  return pathSegments.join("/").replace(HOTLINK_MARKER, "/");
}

/** @param {{ GITHUB_TOKEN?: string }} env */
function githubAuthHeaders(env) {
  const token = env.GITHUB_TOKEN;
  return token ? { Authorization: `token ${token}` } : {};
}

/** @param {string} path */
function resolveContentType(path) {
  const mimeType = FILE_EXTENSION_MIME_TYPES[fileExtension(path)];
  if (!mimeType) {
    return null;
  }
  return TEXTUAL_MIME_TYPES.has(mimeType) ? `${mimeType};charset=UTF-8` : mimeType;
}

// Lowercase extension of the last path segment, with dot (""); lowercasing
// makes ".JPG" and ".jpg" serve identically.
/** @param {string} path */
function fileExtension(path) {
  const fileName = path.slice(path.lastIndexOf("/") + 1);
  const dotIndex = fileName.lastIndexOf(".");
  return dotIndex === -1 ? "" : fileName.slice(dotIndex).toLowerCase();
}

function notFoundResponse() {
  return new Response("404 Not Found", {
    status: 404,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "content-type": "text/html;charset=UTF-8",
    },
  });
}
