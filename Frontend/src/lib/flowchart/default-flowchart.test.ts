import assert from "node:assert/strict";
import test from "node:test";
import { defaultEdges, defaultNodes, freshDefaultEdges, freshDefaultNodes } from "./default-flowchart.ts";

test("fresh flowchart defaults include the starter workflow", () => {
  const nodes = freshDefaultNodes();
  const edges = freshDefaultEdges();
  assert.ok(nodes.some(node => node.type === "start"));
  assert.ok(nodes.some(node => node.type === "process"));
  assert.ok(nodes.some(node => node.type === "decision"));
  assert.ok(nodes.some(node => node.type === "end"));
  assert.ok(edges.length > 0);
});

test("fresh flowchart defaults do not share mutable references", () => {
  const firstNodes = freshDefaultNodes();
  const secondNodes = freshDefaultNodes();
  const firstEdges = freshDefaultEdges();
  const secondEdges = freshDefaultEdges();
  firstNodes[0].position.x = 999;
  firstNodes[0].data.label = "Changed";
  firstEdges[0].label = "Changed";
  assert.notEqual(secondNodes[0].position.x, 999);
  assert.notEqual(secondNodes[0].data.label, "Changed");
  assert.notEqual(secondEdges[0].label, "Changed");
  assert.equal(defaultNodes[0].position.x, 400);
  assert.equal(defaultEdges[0].label, undefined);
});
