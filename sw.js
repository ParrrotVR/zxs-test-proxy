
/************************
 * ZXS Proxy Engine v1.5.9
 * Based on original ZXS-GAMES logic
 ***********************/

// Standard relative import (works on both local and GH Pages)
importScripts("scram/scramjet.all.js");

const { ScramjetServiceWorker } = $scramjetLoadWorker();

// Allow Scramjet to use its default prefix logic (auto-detects from worker location)
const scramjet = new ScramjetServiceWorker();

async function handleRequest(event) {
	await scramjet.loadConfig();

	if (scramjet.route(event)) {
		// Use the event as-is (Original ZXS strategy)
		// Adding credentials: "include" for Google Login porting
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

			// Standard Stealth Injections
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
			// Relax security for proxied games
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
