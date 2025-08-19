// Temporary ambient declarations so the repo typechecks even if Cypress types aren't installed yet.
// Once you install devDependency `cypress`, these merge harmlessly with official types.
declare const cy: any;
declare function describe(name: string, fn: () => void): void;
declare function it(name: string, fn: () => void): void;
