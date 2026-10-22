import assert from "node:assert/strict";
import test from "node:test";
import { isOfficialBiboOrigin } from "./deploy-origin.utils";

test("deployment identity accepts supported GitHub transports and rejects lookalike hosts or repositories", () => {
  for (const origin of ["git@github.com:Peiiii/bibo.git", "https://github.com/Peiiii/bibo", "ssh://git@github.com/Peiiii/bibo.git", "ssh://git@ssh.github.com:443/Peiiii/bibo.git"]) assert.equal(isOfficialBiboOrigin(origin), true, origin);
  for (const origin of ["git@notgithub.com:Peiiii/bibo.git", "https://github.com.evil.test/Peiiii/bibo", "https://github.com/other/bibo.git", "https://github.com/Peiiii/nextclaw.git", "https://user@github.com/Peiiii/bibo", "ssh://git@ssh.github.com:2222/Peiiii/bibo", "https://github.com/Peiiii/bibo?ref=main", "file:///Peiiii/bibo"]) assert.equal(isOfficialBiboOrigin(origin), false, origin);
});
