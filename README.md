# Agent code review
- Reviews the pull request with repo context and provides the information about critical fixes, suggestions
- Repo is indexed for better context 
- Inngest workflow to manage the background workflow
- LangChain ecosystem for implementing the RAG pipeline

## Commands for running the project
### Inngest server
```bash
npx --ignore-scripts=false inngest-cli@latest dev
```
### Run the application
#### Build the application
```bash
npm run build
```
#### Run the express server
```bash
npm run dev
```

# Work in progress
- Frontend for the whole project
- GitHub webhook to make the process seamless