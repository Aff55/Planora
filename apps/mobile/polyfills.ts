/**
 * Globals that React Native 0.81 assumes the JavaScript engine provides.
 *
 * Hermes gained `DOMException` relatively recently. An older Expo Go ships an
 * older Hermes, and React Native's environment setup reads the global while
 * wiring up fetch/abort support, which fails before the first render with:
 *   [runtime not ready]: ReferenceError: Property 'DOMException' doesn't exist
 *
 * This must be imported before anything that pulls in `react-native`, so it is
 * the first import in index.ts. Defining the global is enough: nothing here
 * needs to be a faithful DOMException, only to exist and behave like an Error
 * with a settable `name`, which is all the call sites use.
 *
 * Delete this once the minimum supported Expo Go ships a Hermes with
 * DOMException built in.
 */
declare const globalThis: Record<string, unknown>;

if (typeof globalThis.DOMException === "undefined") {
  class DOMExceptionPolyfill extends Error {
    constructor(message?: string, name?: string) {
      super(message);
      this.name = name ?? "Error";
    }
  }
  globalThis.DOMException = DOMExceptionPolyfill;
}

export {};
