module.exports = function (api) {
  api.cache(true);
  return {
    // Order matters, and Babel's is counter-intuitive: presets are applied in
    // REVERSE, so babel-preset-expo runs first and @babel/preset-env second.
    // That sequence is required - Expo's preset strips TypeScript, and
    // preset-env must only ever see plain JavaScript.
    //
    // Deliberately no top-level `plugins`. Those run BEFORE presets, i.e. before
    // TypeScript is stripped, and syntax transforms placed there corrupt the
    // output: `constructor(private options)` becomes `function X(private
    // options)`, which is not valid JavaScript.
    //
    // Deliberately no `assumptions` either. Setting setPublicClassFields /
    // constantSuper / noClassCalls alongside the class lowering below reorders
    // class-field initialisation, which breaks React Native's
    // KeyboardAvoidingView: it keeps its handlers as class fields, and
    // `_updateBottomIfNecessary` ended up undefined by the time a keyboard event
    // fired. Spec-compliant output is slightly larger and definitely correct.
    presets: [
      [
        "@babel/preset-env",
        {
          // Metro builds with `unstable_transformProfile=hermes-stable`, which
          // tells Expo's preset to leave modern syntax alone on the assumption
          // that Hermes understands it. An older Expo Go ships an older Hermes
          // that does not. iOS 12 predates `#private` class fields, so naming it
          // here makes preset-env lower them - correctly, and after TypeScript
          // has already been removed.
          targets: { ios: "12" },
          // Metro owns module handling; rewriting to CommonJS here would break
          // its dependency graph and lazy loading.
          modules: false,
          // Hermes reports `typeof Symbol()` correctly, and this transform adds
          // a sizeable helper to every file for no benefit.
          exclude: ["transform-typeof-symbol"],
          // Forced regardless of target, because iOS 12 counts classes as
          // supported. The older Hermes in Expo Go cannot construct a class that
          // extends a built-in - `class DOMException extends Error` fails and
          // leaves the binding undefined, killing startup. Lowering routes that
          // through `wrapNativeSuper`, which works on any engine.
          include: ["@babel/plugin-transform-classes"]
        }
      ],
      "babel-preset-expo"
    ]
  };
};
