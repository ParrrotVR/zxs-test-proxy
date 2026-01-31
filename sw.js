
/************************
 * ZXS Proxy Engine v1.6.0
 ***********************/

importScripts("scram/scramjet.all.js");

// Auto-detect root path from the Service Worker scope
const swRoot = self.registration.scope; // e.g., "http://localhost:8080/" or ".../zxs-test-proxy/"
const swPath = new URL(swRoot).pathname;

const { ScramjetServiceWorker } = $scramjetLoadWorker();

// Explicitly set the prefix to match index.html
const scramjet = new ScramjetServiceWorker({
	prefix: swPath + "scram/"
});

async function handleRequest(event) {
	await scramjet.loadConfig();

	if (scramjet.route(event)) {
		// Fix: Do NOT spread the event. 
		// We create a new request with credentials: 'include' for session porting.
		const modifiedRequest = new Request(event.request, {
			credentials: "include"
		});

		// Use the original event but override the request
		const response = await scramjet.fetch(modifiedRequest, event);

		const contentType = response.headers.get("content-type") || "";

		if (contentType.includes("text/html")) {
			const originalText = await response.text();

			const stealthScript = `<script>
                (function() {
                    const hide = { get: () => undefined, enumerable: true, configurable: true };
                    Object.defineProperty(navigator, 'webdriver', hide);
                    window.chrome = { runtime: {} };
                    window.navigator.plugins = [1,2,3];
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
