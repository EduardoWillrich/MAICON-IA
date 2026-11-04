import test from "node:test";
import assert from "node:assert/strict";
import { inicioDoDiaPacifico, restante } from "../server/saldoIa.js";

test("o restante nunca fica negativo", () => {
  assert.equal(restante(0, 1500), 1500);
  assert.equal(restante(20, 1500), 1480);
  assert.equal(restante(1600, 1500), 0);
});

test("o dia da cota do Google começa à meia-noite da Califórnia", () => {
  const inicio = inicioDoDiaPacifico(new Date("2026-11-03T15:00:00Z"));
  const local = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(inicio));
  assert.equal(local, "00:00");
  assert.ok(inicio < "2026-11-03T15:00:00.000Z");
});
