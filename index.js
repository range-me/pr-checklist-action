const core = require("@actions/core");
const github = require("@actions/github");
const yaml = require("yaml");
const minimatch = require("minimatch");
const escapeRegExp = require("lodash.escaperegexp");
const { readFileSync } = require("fs");

const TITLE = ":robot: Complete the following checklist before merging:";
const ERROR_MESSAGE = {
  message: "Incomplete checklist"
};

function loadTodos() {
  return yaml.parse(readFileSync("CHECKLIST.yml", { encoding: "utf8" }));
}

function getNewPrBody(pr, missingTodos) {
  if (pr.body.includes(TITLE)) {
    return pr.body.replace(TITLE, TITLE + "\n" + missingTodos.join("\n"));
  }
  return [pr.body, "", TITLE, "", ...missingTodos].join("\n");
}

async function run() {
  const issue = github.context.issue;
  const pr = github.context.payload.pull_request;
  const ghToken = core.getInput("gh-token", { required: true });
  const client = new github.GitHub(ghToken);

  const changedFiles = (await client.pulls.listFiles({
    owner: issue.owner,
    repo: issue.repo,
    pull_number: issue.number,
    per_page: 100
  })).data.map(file => file.filename);

  const todos = loadTodos();

  const requiredTodos = [...(todos.hardcoded || [])];

  Object.keys(todos.contextual).forEach(pattern => {
    if (changedFiles.some(file => minimatch(file, pattern))) {
      requiredTodos.push(...todos.contextual[pattern]);
    }
  });

  const missingTodos = [];

  requiredTodos.forEach(todo => {
    const reg = new RegExp(`- \\[(x| )?\\] ${escapeRegExp(todo)}`);
    if (!reg.test(pr.body)) {
      missingTodos.push(`- [ ] ${todo}`);
    }
  });

  if (missingTodos.length > 0) {
    const newBody = getNewPrBody(pr, missingTodos);
    await client.pulls.update({
      owner: issue.owner,
      repo: issue.repo,
      pull_number: issue.number,
      body: newBody
    });
  }

  const incompleteTodo = missingTodos.length > 0 || pr.body.includes("- [ ]");

  client.repos.createStatus({
    owner: issue.owner,
    repo: issue.repo,
    sha: pr.head.sha,
    state: incompleteTodo ? "error" : "success",
    description: incompleteTodo ? "Incomplete checklist" : "Ready to merge",
    context: "PR Checklist"
  });
}

run().catch(err => core.setFailed(err.message));
