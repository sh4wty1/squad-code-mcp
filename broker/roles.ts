/**
 * squad roles file
 *
 * The base skills of each role, by their name in the registry, with those of each
 * workflow apart (AD-019). The launcher reads the file to tell a session which
 * skills it has. A file out of the format is refused whole, with its path.
 */

import { readFileSync } from "node:fs";
import { ROSTER, type Role } from "./peers.ts";

export interface RoleEntry {
  name: Role;
  when_to_use: string;
  skills: string[];
  workflows?: { tlc?: string[]; "matt-pocock"?: string[] };
}

const WORKFLOWS = ["tlc", "matt-pocock"];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isText(value: unknown): boolean {
  return typeof value === "string" && value !== "";
}

function isTexts(value: unknown): boolean {
  return Array.isArray(value) && value.every(isText);
}

// The entries of the file, as read. Throws an Error with the path for a file that is not there
// or is out of the format.
export function readRoles(path: string): RoleEntry[] {
  const refuse = (cause: string) => new Error(`${path}: ${cause}`);

  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    throw refuse("the roles file cannot be read");
  }
  let file: unknown;
  try {
    file = JSON.parse(text);
  } catch {
    throw refuse("the roles file is not JSON");
  }
  if (!isObject(file) || !Array.isArray(file.roles)) throw refuse("the roles file must be an object with a list in roles");

  const seen = new Set<unknown>();
  for (const entry of file.roles as unknown[]) {
    if (!isObject(entry) || !ROSTER.some((r) => r.role === entry.name)) {
      throw refuse("the name of a role must be mother, leader, worker or judge");
    }
    const { name, when_to_use, skills, workflows } = entry;
    if (seen.has(name)) throw refuse(`the role ${name} is there more than once`);
    seen.add(name);
    if (!isText(when_to_use)) throw refuse(`when_to_use of ${name} must be a non-empty text`);
    if (!isTexts(skills)) throw refuse(`skills of ${name} must be a list of non-empty texts`);
    if (!("workflows" in entry)) continue;
    if (!isObject(workflows) || !Object.keys(workflows).every((key) => WORKFLOWS.includes(key))) {
      throw refuse(`workflows of ${name} must be an object with no key but tlc and matt-pocock`);
    }
    if (!Object.values(workflows).every(isTexts)) {
      throw refuse(`each workflow of ${name} must be a list of non-empty texts`);
    }
  }
  return file.roles as RoleEntry[];
}
