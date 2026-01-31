
/************************
 * SJ-Static | by VAPOR
 ***********************/



if (navigator.userAgent.includes("Firefox")) {
	Object.defineProperty(globalThis, "crossOriginIsolated", {
		value: true,
		writable: false,
	});
}

importScripts("scram/scramjet.all.js");

const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker();


async function handleRequest(event) {
	await scramjet.loadConfig();
	if (scramjet.route(event)) {
		const url = new URL(event.request.url);

		// Clean the request headers
		const requestHeaders = new Headers(event.request.headers);
		requestHeaders.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36");
		requestHeaders.delete("x-powered-by");

		const modifiedRequest = new Request(event.request, {
			headers: requestHeaders,
			credentials: "include" // CRITICAL for session porting
		});

		const response = await scramjet.fetch({
			...event,
			request: modifiedRequest
		});

		const contentType = response.headers.get("content-type") || "";
		if (contentType.includes("text/html")) {
			let originalText = await response.text();

			// --- ADVANCED STEALTH PATCH v2 ---
			const stealthScript = `<script>
				(function() {
					const hide = {
						get: () => undefined,
						enumerable: true,
						configurable: true
					};
					Object.defineProperty(navigator, 'webdriver', hide);
					Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
					Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
					window.chrome = { runtime: {}, loadTimes: Date.now, csi: () => {} };
				})();
			</script>`;

			const modifiedHtml = originalText.replace(
				/<head[^>]*>/i,
				(match) => `${match}${stealthScript}`
			);

			const newHeaders = new Headers(response.headers);
			newHeaders.delete("content-security-policy"); // Remove CSP to allow login scripts
			newHeaders.delete("x-frame-options"); // Allow the login to work in iframes

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

let playgroundData;
self.addEventListener("message", ({ data }) => {
	if (data.type === "playgroundData") {
		playgroundData = data;
	}
});

scramjet.addEventListener("request", (e) => {
	if (playgroundData && e.url.href.startsWith(playgroundData.origin)) {
		const headers = {};
		const origin = playgroundData.origin;
		if (e.url.href === origin + "/") {
			headers["content-type"] = "text/html";
			e.response = new Response(playgroundData.html, {
				headers,
			});
		} else if (e.url.href === origin + "/style.css") {
			headers["content-type"] = "text/css";
			e.response = new Response(playgroundData.css, {
				headers,
			});
		} else if (e.url.href === origin + "/script.js") {
			headers["content-type"] = "application/javascript";
			e.response = new Response(playgroundData.js, {
				headers,
			});
		} else {
			e.response = new Response("empty response", {
				headers,
			});
		}
		e.response.rawHeaders = headers;
		e.response.rawResponse = {
			body: e.response.body,
			headers: headers,
			status: e.response.status,
			statusText: e.response.statusText,
		};
		e.response.finalURL = e.url.toString();
	} else {
		return;
	}
});
