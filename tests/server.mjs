import assert from "node:assert/strict";

const worker = (await import("../dist/server/index.js")).default;

async function request(path, method = "GET") {
  return worker.fetch(new Request(`https://logiq.test${path}`, { method }));
}

const expectedRoutes = [
  ["/", 200, "text/html"],
  ["/index.html", 200, "text/html"],
  ["/styles.css", 200, "text/css"],
  ["/app.js", 200, "text/javascript"],
];

for (const [path, status, type] of expectedRoutes) {
  const response = await request(path);
  const body = await response.text();
  assert.equal(response.status, status, `${path}: status`);
  assert.match(response.headers.get("content-type") || "", new RegExp(type), `${path}: Content-Type`);
  assert.ok(body.length > 100, `${path}: conteúdo presente`);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff", `${path}: cabeçalho de segurança`);
}

const home = await (await request("/")).text();
assert.match(home, /Leitura guiada/, "Build contém a nova interpretação visual");
assert.match(home, /styles\.css/, "HTML referencia o CSS");
assert.match(home, /app\.js/, "HTML referencia o JavaScript");

const head = await request("/app.js", "HEAD");
assert.equal(head.status, 200, "HEAD retorna sucesso");
assert.equal((await head.text()).length, 0, "HEAD não retorna corpo");

const missing = await request("/nao-existe");
assert.equal(missing.status, 404, "Rota inexistente retorna 404");
assert.match(await missing.text(), /não encontrada/i, "Mensagem de rota inexistente");

console.log("OK — servidor: rotas, tipos MIME, HEAD, 404 e cabeçalhos de segurança aprovados.");
