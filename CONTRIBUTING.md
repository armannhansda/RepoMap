# Contributing to RepoMap

First off, thank you for considering contributing to RepoMap! It's people like you that make it a great tool for the community.

Following these guidelines helps to communicate that you respect the time of the developers managing and developing this open source project. In return, they should reciprocate that respect in addressing your issue, assessing changes, and helping you finalize your pull requests.

## Code of Conduct

By participating in this project, you are expected to uphold our [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting Started

### Local Development Setup

RepoMap requires two components to run: the Node.js backend (`server`) and the Next.js frontend (`client`).

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_GITHUB_USERNAME/RepoMap.git
   cd RepoMap
   ```

2. **Backend Setup:**
   ```bash
   cd server
   npm install
   cp .env.example .env
   # Add your GEMINI_API_KEY (and optionally GROQ_API_KEY) in the .env file
   npm run dev
   ```

3. **Frontend Setup:**
   Open a new terminal window:
   ```bash
   cd client
   npm install
   cp .env.example .env
   npm run dev
   ```
   The client will run on `http://localhost:3000` and the server on `http://localhost:5001`.

### Docker Development Setup

If you prefer to run the environment via Docker, you can spin up both the frontend and backend simultaneously.

1. **Clone the repository:**
   ```bash
   git clone https://github.com/YOUR_GITHUB_USERNAME/RepoMap.git
   cd RepoMap
   ```

2. **Configure Environment Variables:**
   Create a root `.env` file for the docker-compose orchestrator:
   ```bash
   touch .env
   # Add your GEMINI_API_KEY (and optionally GROQ_API_KEY) in this .env file
   ```

3. **Start the Containers:**
   ```bash
   docker-compose up --build
   ```
   The client will run on `http://localhost:3000` and the server API on `http://localhost:5001`.

## How to Contribute

### Reporting Bugs

If you find a bug, please use the **Bug Report** issue template. Include:
- Steps to reproduce the bug.
- The expected behavior.
- What actually happened.
- Information about your environment (OS, Browser, Node.js version).

### Suggesting Enhancements

If you have an idea to improve RepoMap, please use the **Feature Request** issue template. Include:
- A clear descriptive title.
- A detailed description of the proposed feature.
- Why this feature would be useful to most users.

### Pull Requests

1. **Fork the repository** and create your branch from `main`.
2. **Branch naming:** Use a descriptive branch name like `feature/add-new-graph-layout` or `fix/issue-42`.
3. **If you've added code** that should be tested, add tests.
4. **Ensure the test suite passes** (if applicable).
5. **Format your code**: Follow the existing styling conventions in the codebase.
6. **Commit messages:** Write clear, concise commit messages.
7. **Submit a Pull Request** using the provided PR template.

## Need Help?

If you have any questions, feel free to open a discussion or reach out via an issue. Thank you for your contributions!
