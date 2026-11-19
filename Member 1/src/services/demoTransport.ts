export const browserDemo = import.meta.env.VITE_CARELOOP_BROWSER_DEMO === "true";
export const tokenKey = "careloop.accessToken";
export const browserDatabaseKey = "careloop.browserDb.v1";

export function demoIdentityStorage() {
  return browserDemo ? sessionStorage : localStorage;
}

export const demoFetch: typeof fetch = async (input, init) => {
  if (!browserDemo) return fetch(input, init);
  const request = new Request(input, init);
  const url = new URL(request.url);
  if (url.origin !== window.location.origin || !url.pathname.startsWith("/api/")) {
    throw new Error("The browser demo only handles CARELOOP API requests.");
  }
  const { runBrowserRequest } = await import("../judge/browserDatabase");
  return runBrowserRequest(request);
};
