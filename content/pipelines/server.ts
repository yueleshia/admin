//run: deno --allow-net --allow-read % 8000

const port = Deno.args[0];

function content_type(pathname: string) {
  if (pathname.endsWith(".json")) {
    return "application/json; charset=utf-8";
  } else {
    return "text/plain; charset=utf-8";
  }
}

Deno.serve({ port: port }, (req) => {
  if (req.method !== "GET") {
    return new Response("Invalid HTTP method", { status: 400 });
  }

  const url = new URL(req.url);
  console.log(url);
  if (url.hostname !== "localhost") {
    return new Response("", { status: 401, });
  } else if (url.pathname.startsWith("/tmp")) {
    try {
      return new Response(Deno.readFileSync(`./${url.pathname}`), {
        status: 200,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "content-type": content_type(url.pathname),
        }
      });
    } catch (_e) {
      0 + 0;
    }
  }
  return new Response("{}", {
    status: 404,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "content-type": "application/json; charset=utf-8",
    },
  });
});
