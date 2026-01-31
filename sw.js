
/************************
 * ZXS Proxy Engine v1.5.6
 ***********************/

importScripts("scram/scramjet.all.js");

// Dynamic path detection for Service Worker
const isGH = self.location.hostname.includes('github.io');
const pathSegments = self.location.pathname.split('/').filter(s => s);
// sw.js is at the root of the project, so the repo name is the segment before it
const repoName = isGH ? pathSegments[0] : '';
const root = isGH ? `/${repoName}/` : '/';

const { ScramjetServiceWorker } = $scramjetLoadWorker();

// Explicitly tell the worker what the prefix is
const scramjet = new ScramjetServiceWorker({
	prefix: root + 'scram/'
});

async function handleRequest(event) {
	// Ensure config is loaded with the correct prefix
	await scramjet.loadConfig();

	if (scramjet.route(event)) {
		const modifiedRequest = new Request(event.request, {
			credentials: "include"
		});

		const response = await scramjet.fetch({
			...event,
			request: modifiedRequest
		});

		const contentType = response.headers.get("content-type") || "";

		if (contentType.includes("text/html")) {
			const originalText = await response.text();

			const stealthScript = `<script>
                (function() {
                    const hide = { get: () => undefined, enumerable: true, configurable: true };
                    Object.defineProperty(navigator, 'webdriver', hide);
                    window.chrome = { runtime: {} };
                })();
            </script>`;

			const modifiedHtml = originalText.replace(
				/<head[^>]*>/i,
				(match) => `${match}${stealthScript}`
			);

			const newHeaders = new Headers(response.headers);
			newHeaders.delete("content-security-policy");
			newHeaders.delete("x-frame-options");

			return new Response(modifiedHtml, {
				status: response.status,
				statusText: response.statusText,
				headers: newHeaders,
			});
		}

		return response;
	}

	return fetch(event.request);
}

self.addEventListener("fetch", (event) => {
	event.respondWith(handleRequest(event));
});
