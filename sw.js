
/************************
 * ZXS Proxy Engine v1.5.5
 ***********************/

importScripts("scram/scramjet.all.js");

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();

async function handleRequest(event) {
	await scramjet.loadConfig();

	if (scramjet.route(event)) {
		// Shared credentials for session porting
		const modifiedRequest = new Request(event.request, {
			credentials: "include"
		});

		const response = await scramjet.fetch({
			...event,
			request: modifiedRequest
		});

		const contentType = response.headers.get("content-type") || "";

		// Inject basic stealth into HTML
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

	// Normal fetch for non-proxied requests
	return fetch(event.request);
}

self.addEventListener("fetch", (event) => {
	event.respondWith(handleRequest(event));
});

// BareMux messaging placeholder
self.addEventListener("message", ({ data }) => {
	if (data.type === "playgroundData") {
		// Placeholder for future extensibility
	}
});
