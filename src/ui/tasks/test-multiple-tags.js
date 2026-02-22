const assert = require("assert");

// Mock what task.ts gets: a string "col1(foo) col2(bar)" etc.
let content = "- [ ] Task #col1 #col2";
console.log("Starting original content: ", content);

// Assume col1 and col2 are column tags.
// ...
