
/************************
 * ZXS Proxy Engine v1.6.1
 ***********************/

importScripts("scram/scramjet.all.js");

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();

// We need to wait for config to load before we can route or fetch
let configLoaded = false;
const loadingPromise = scramjet.loadConfig().then(() => {
	configLoaded = true;
	console.log("ZXS SW: Config Loaded.");
});

async function handleRequest(event) {
	if (!configLoaded) await loadingPromise;

	// Check if Scramjet should handle this URL
	if (scramjet.route(event)) {
		try {
			// Port credentials for Google Login
			const modifiedRequest = new Request(event.request, {
				credentials: "include"
			});

			// Correct signature: { request, clientId }
			const response = await scramjet.fetch({
				request: modifiedRequest,
				clientId: event.clientId
			});

			// Check if we need to inject stealth into HTML
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
		} catch (err) {
			console.error("ZXS SW Fetch Error:", err);
			// Fallback to error template if available
			return new Response("ZXS Proxy Interception Error: " + err.message, { status: 500 });
		}
	}

	// Default network fetch for non-proxied assets
	return fetch(event.request);
}

self.addEventListener("fetch", (event) => {
	event.respondWith(handleRequest(event));
});
