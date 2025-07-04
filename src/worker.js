export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const textParam = url.searchParams.get('text') || 'Default Text';
    const codeParam = url.searchParams.get('code') || 'https://workers.cloudflare.com';

    // Fetch the HTML template
    // In a real worker, you would serve static assets from R2 or KV,
    // or include them in the worker bundle if small enough.
    // For this example, we'll assume index.html and style.css are accessible.
    // When using `wrangler dev`, it serves from the `public` directory automatically.

    let html;
    try {
      // In a deployed worker, you'd need to fetch this from a public URL or include it.
      // For local dev with `wrangler dev`, it correctly serves from ./public
      // This fetch should resolve to the index.html in the `public` directory
      // due to the `[site] bucket = "./public"` in wrangler.toml
      const htmlResponse = await env.ASSETS.fetch(new URL('/index.html', request.url)); // Changed this line
      if (!htmlResponse.ok) {
        return new Response('Error fetching HTML template: ' + htmlResponse.statusText, { status: 500 });
      }
      html = await htmlResponse.text();
    } catch (e) {
      return new Response('Error fetching HTML: ' + e.message, { status: 500 });
    }

    // Use HTMLRewriter to modify the HTML
    const rewriter = new HTMLRewriter()
      .on('#text-container', {
        element(element) {
          element.setInnerContent(textParam);
        },
      })
      .on('#qr-image', {
        element(element) {
          const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(codeParam)}`;
          element.setAttribute('src', qrUrl);
          element.setAttribute('alt', `QR Code for ${codeParam}`);
        },
      });

    const response = new Response(html, { // Create a new response with the original HTML
        headers: { 'Content-Type': 'text/html;charset=UTF-8' },
    });

    return rewriter.transform(response); // Transform this new response
  },
};
