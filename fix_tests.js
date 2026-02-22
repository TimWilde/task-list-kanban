const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/ui/tasks/tests/task.tests.ts');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
complete task #column");',
complete task #cancelled #column");'
);

content = content.replace(
complete task #column");',
complete task #cancelled #column");'
);

// Add tests for Phase 4
const newTests = `
describe("Phase 4 tests", () => {
st columnTags = {
celled": "cancelled",
": "column"
g removes all standalone cancelled tokens with whitespace cleanup", () => {
st taskString = "- [-] Buy  #cancelled  groceries #Cancelled  #notcancelled";
{
ew Task(taskString, { path: "/" }, 0, columnTags, false, "xX", "-", "");
celled).toBe(false);
Buy groceries #notcancelled");
g empty content works", () => {
st taskString = "- [-] #cancelled";
{
ew Task(taskString, { path: "/" }, 0, columnTags, false, "xX", "-", "");
tics preserve state on non-Done -> non-Done", () => {
st taskString = "- [-] Some task #cancelled";
{
ew Task(taskString, { path: "/" }, 0, columnTags, false, "xX", "-", "");
 = "column";
task #cancelled #column");
tics Done -> non-Done clears marker", () => {
st taskString = "- [x] Some task #column";
{
ew Task(taskString, { path: "/" }, 0, columnTags, false, "xX", "-", "");
 = "uncategorised";
Some task #uncategorised");
tics Done -> cancelled-mapped sets cancelled marker and tag", () => {
st taskString = "- [x] Some task #column";
{
ew Task(taskString, { path: "/" }, 0, columnTags, false, "xX", "-", "");
 = "cancelled";
task #cancelled");
tent += newTests;
fs.writeFileSync(file, content);
console.log("Tests updated.");
