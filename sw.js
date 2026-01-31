
/************************
 * ZXS Proxy Engine v1.5.7
 ***********************/

// Using a standard relative path for the worker script
importScripts("scram/scramjet.all.js");

const { ScramjetServiceWorker } = $scramjetLoadWorker();

// Standard initialization with relative prefix
const scramjet = new ScramjetServiceWorker({
	prefix: "./scram/"
});

async function handleRequest(event) {
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
