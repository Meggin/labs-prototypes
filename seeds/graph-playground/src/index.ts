/**
 * @license
 * Copyright 2023 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { intro, log, note, outro, text } from "@clack/prompts";
import { config } from "dotenv";

import { OutputValues, InputValues } from "@google-labs/graph-runner";
import { Board, type ProbeEvent } from "@google-labs/breadboard";

import { ReActHelper } from "./react.js";

// Load the environment variables from `.env` file.
// This is how the `secrets` node gets ahold of the keys.
config();

const ask = async (inputs: InputValues): Promise<OutputValues> => {
  const defaultValue = "<Exit>";
  const message = ((inputs && inputs.message) as string) || "Enter some text";
  const input = await text({
    message,
    defaultValue,
  });
  if (input === defaultValue) return { exit: true };
  return { text: input };
};

// Line-wrapping magic courtesy of
// https://stackoverflow.com/questions/14484787/wrap-text-in-javascript
// Wrap lines neatly for clack.
const wrap = (s: string) => {
  const cols = (process.stdout.columns || 80) - 10;
  return s.replace(
    new RegExp(`(?![^\\n]{1,${cols}}$)([^\\n]{1,${cols}})\\s`, "g"),
    "$1\n"
  );
};

const show = (outputs: OutputValues) => {
  const { text } = outputs;
  if (typeof text == "string") log.success(wrap(text));
  else log.success(JSON.stringify(text));
};

// Use Breadboard probe feature to create a nice note in CLI for
// every text completion.
const probe = new EventTarget();
probe.addEventListener("node", (event: Event) => {
  const { detail } = event as ProbeEvent;
  if (detail.descriptor.type !== "text-completion") return;
  const value = (detail?.outputs?.completion as string) || "empty response";
  note(wrap(value), "text completion");
});

intro("Let's traverse a graph!");

// Load the board, specified in the command line.
const board = await Board.load(process.argv[2]);

// Add a custom kit.
//board.addKit(ReActHelper);

// Run the board until it finishes. This may run forever.
for await (const result of board.run(probe)) {
  if (result.seeksInputs) {
    result.inputs = await ask(result.inputArguments);
  } else {
    show(result.outputs);
  }
}

outro("Awesome work! Let's do this again sometime.");
