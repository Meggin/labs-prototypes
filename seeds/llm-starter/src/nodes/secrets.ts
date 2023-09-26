/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * A kind of input node that provides secret values, such as API keys.
 * Currently, it simply reads them from environment.
 */

import type { InputValues, OutputValues } from "@google-labs/graph-runner";

type Environment = "node" | "browser" | "worker";

const environment = (): Environment =>
  typeof globalThis.process !== "undefined"
    ? "node"
    : typeof globalThis.window !== "undefined"
    ? "browser"
    : "worker";

export type SecretInputs = {
  keys: string[];
};

export type SecretWorkerResponse = {
  type: "provideSecret";
  data: string;
};

const getEnvironmentValue = async (key: string) => {
  const env = environment();
  if (env === "node") {
    return process.env[key];
  } else if (env === "browser") {
    // How do we avoid namespace clashes?
    return globalThis.localStorage.getItem(key);
  } else if (env === "worker") {
    // TODO: Calling main thread is a general pattern, figure out a way to
    // avoid a special call here. Maybe some Board util?
    return new Promise<string>((resolve) => {
      self.postMessage({
        type: "requestSecret",
        data: key,
      });
      self.addEventListener("message", (e) => {
        const reply = e.data as SecretWorkerResponse;
        if (!reply.type || reply.type != "provideSecret") return;
        resolve(reply.data);
      });
    });
  }
};

export const requireNonEmpty = (key: string, value?: string | null) => {
  if (!value)
    throw new Error(
      `Key "${key}" was not specified. Please check your environment and make sure it is set.`
    );
  return value;
};

export default async (inputs: InputValues) => {
  const { keys = [] } = inputs as SecretInputs;
  return Object.fromEntries(
    await Promise.all(
      keys.map(async (key) => [
        key,
        requireNonEmpty(key, await getEnvironmentValue(key)),
      ])
    )
  ) as OutputValues;
};
