
/************************
 * ZXS Proxy Engine v1.5.8
 ***********************/

importScripts("scram/scramjet.all.js");

// Dynamic path detection for Service Worker
const swUrl = new URL(self.registration.scope);
const swPath = swUrl.pathname; // Should be "/" or "/repo/"

console.log("ZXS SW Booting. Scope:", swPath);

const { ScramjetServiceWorker } = $scramjetLoadWorker();

// The prefix MUST be absolute from the root and match index.html exactly
const scramjet = new ScramjetServiceWorker({
	prefix: swPath + "scram/"
});

async function handleRequest(event) {
	await scramjet.loadConfig();

	if (scramjet.route(event)) {
		// Standard fetch through Scramjet
		// We use the original event to ensure all metadata is preserved
		const response = await scramjet.fetch(event);

		const contentType = response.headers.get("content-type") || "";

		if (contentType.includes("text/html")) {
			const originalText = await response.text();

			// Basic stealth to avoid 'unsecure browser' flags
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
