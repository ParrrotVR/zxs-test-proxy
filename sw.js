
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
		const isAuthFlag = url.hostname.includes("google.com") || url.hostname.includes("discord.com");

		const modifiedRequest = new Request(event.request, {
			headers: {
				...Object.fromEntries(event.request.headers),
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
				"sec-ch-ua": '"Not_A Brand";v="8", "Chromium";v="121", "Google Chrome";v="121"',
				"sec-ch-ua-mobile": "?0",
				"sec-ch-ua-platform": '"Windows"'
			}
		});

		const response = await scramjet.fetch({
			...event,
			request: modifiedRequest
		});

		const contentType = response.headers.get("content-type") || "";
		if (contentType.includes("text/html")) {
			let originalText = await response.text();

			// --- DEEP STEALTH PATCH ---
			// 1. Hide the WebDriver flag from Google
			const stealthScript = `<script>
				Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
				window.chrome = { runtime: {} };
			</script>`;

			// 2. Inject stealth script AND remove visible proxy comments
			const modifiedHtml = originalText.replace(
				/<head[^>]*>/i,
				(match) => `${match}${stealthScript}`
			);

			const newHeaders = new Headers(response.headers);
			// Remove custom headers that flag proxies
			newHeaders.delete("x-powered-by");

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
