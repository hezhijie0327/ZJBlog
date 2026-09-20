// Description: Using Cloudflare Workers to map and mirror hezhijie0327's repos.

addEventListener("fetch", (event) => {
  const fetchEvent = /** @type {any} */ (event);
  fetchEvent.respondWith(handleRequest(fetchEvent.request));
});

/** @param {Request} request */
async function handleRequest(request) {
  const GITHUB_API_TOKEN = "";
  const requestUrl = new URL(request.url);
  const pathSegments = requestUrl.pathname.replace(/^\/+/, "").split("/");

  if (pathSegments[0] === "hezhijie0327") {
    pathSegments.shift();
  }

  const rawPathSegments = [...pathSegments];
  const specialIndex = rawPathSegments.findIndex(
    (segment) => segment === "blob" || segment === "edit" || segment === "raw",
  );
  if (specialIndex !== -1) {
    rawPathSegments.splice(specialIndex, 1);
  }

  const url = rawPathSegments.join("/").replace(/\/hotlink-ok\//gim, "/");

  const response_raw = await fetch(`https://raw.githubusercontent.com/hezhijie0327/${url}`, {
    headers: { Authorization: `token ${GITHUB_API_TOKEN}` },
  });

  if (response_raw.status !== 200) {
    return new Response("404 Not Found", {
      status: 404,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "content-type": "text/html;charset=UTF-8",
      },
    });
  }

  const extensionMap = /** @type {{ [key: string]: string }} */ ({
    ".cer": "application/pem-certificate-chain;charset=UTF-8",
    ".cert": "application/pem-certificate-chain;charset=UTF-8",
    ".csr": "application/pem-certificate-chain;charset=UTF-8",
    ".key": "application/pem-certificate-chain;charset=UTF-8",
    ".conf": "text/plain;charset=UTF-8",
    ".dockerfile": "text/plain;charset=UTF-8",
    ".header": "text/plain;charset=UTF-8",
    ".patch": "text/plain;charset=UTF-8",
    ".txt": "text/plain;charset=UTF-8",
    ".css": "text/css;charset=UTF-8",
    ".dat": "application/octet-stream;charset=UTF-8",
    ".eot": "application/vnd.ms-fontobject;charset=UTF-8",
    ".gz": "application/gzip;charset=UTF-8",
    ".html": "text/html;charset=UTF-8",
    ".jpg": "image/jpeg;charset=UTF-8",
    ".js": "text/javascript;charset=UTF-8",
    ".ts": "text/javascript;charset=UTF-8",
    ".tsx": "text/javascript;charset=UTF-8",
    ".json": "application/json;charset=UTF-8",
    ".webmanifest": "application/json;charset=UTF-8",
    ".pfx": "application/pkcs12;charset=UTF-8",
    ".png": "image/png;charset=UTF-8",
    ".py": "text/x-python;charset=UTF-8",
    ".sh": "application/x-sh;charset=UTF-8",
    ".svg": "image/svg+xml;charset=UTF-8",
    ".ttf": "font/ttf;charset=UTF-8",
    ".woff": "font/woff;charset=UTF-8",
    ".woff2": "font/woff2;charset=UTF-8",
    ".yaml": "application/yaml;charset=UTF-8",
    ".yml": "application/yaml;charset=UTF-8",
    ".zip": "application/zip;charset=UTF-8",
  });

  let contentType = null;
  for (const ext in extensionMap) {
    if (url.match(new RegExp(`${ext}$`))) {
      contentType = extensionMap[ext];
      break;
    }
  }

  return new Response(response_raw.body, {
    status: response_raw.status,
    headers: contentType
      ? {
          "Access-Control-Allow-Origin": "*",
          "content-type": contentType,
        }
      : response_raw.headers,
  });
}
