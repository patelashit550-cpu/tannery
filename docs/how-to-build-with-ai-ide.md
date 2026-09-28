# How to Build a Web Application Using Tannery and an AI IDE

This guide provides a step-by-step workflow for using the [`patelashit550-cpu/tannery`](https://github.com/patelashit550-cpu/tannery) repository template alongside an AI-assisted IDE (such as Cursor, VS Code with GitHub Copilot / Claude Dev, or Windsurf) to generate a custom website or web application.

---

### Step 1: Set Up the Repository

1. **Use the Template or Clone the Repo**
   * Go to the repository: `https://github.com/patelashit550-cpu/tannery`.
   * Click the **"Use this template"** button at the top right to create a new repository under your own GitHub account.
   * Alternatively, clone it locally using your terminal
   * Incidentally if you don't know what a terminal is then ask ChatGPT or Gemini - no there's no dark sarcasm nor any such thing as a stupid question:
     ```bash
     git clone https://github.com/patelashit550-cpu/tannery.git my-new-site
     cd my-new-site
     ```

2. **Install Dependencies**
   * Open your terminal inside the project directory and run the package setup:
     ```bash
     npm install
     # or yarn install / pnpm install
     ```

---

### Step 2: Open the Project in Your AI-Enabled IDE

1. **Launch Your IDE**
   * Open the project folder in an AI-integrated code editor (e.g., **Cursor**, **VS Code** with Copilot/Continue/Claude Dev, or **Windsurf**).
2. **Verify Project Structure**
   * Familiarize yourself with the workspace (typically containing `src/`, component folders, configuration files, and package configurations).

---

### Step 3: Define Your App Specification with AI

1. **Create a System Prompt / Prompt Document**
   * Create a file named `PROMPT.md` or `SPEC.md` in the root folder.
   * Write down the requirements for your site, including:
     * **Goal:** (e.g., *"Build a landing page for a SaaS platform with light/dark mode and dynamic pricing cards."*)
     * **Pages & Routes:** Define navigation structure.
     * **Design & Theme:** Palette, typography, layout rules.
     * **Components:** List required UI elements (Header, Hero section, Features, Footer).

2. **Feed Context to the AI Agent**
   * In your IDE's AI Chat window (e.g., `Cmd+L` or `Ctrl+L` in Cursor), reference the project files and your specification doc:
     > *"Read `package.json` and `PROMPT.md`. Generate the base components and page structure for the site according to the specification."*

---

### Step 4: Iterative Development with AI

1. **Build Components & Views**
   * Use inline AI editing (e.g., `Cmd+K` or `Ctrl+K`) or agent mode to build features piece-by-piece:
     * **Hero Section:** *"Create a modern hero component in `src/components/Hero.tsx` using Tailwind CSS."*
     * **Navigation & Layout:** *"Implement a responsive header with mobile toggle menu."*
2. **Review and Test**
   * Start your local development server to preview changes live:
     ```bash
     npm run dev
     ```
   * Inspect the browser output, note any UI/UX adjustments, and prompt the AI to make refinements.

---

### Step 5: Test and Build

1. **Run Linting & Type Checks**
   * Ensure there are no TypeScript or syntax errors:
     ```bash
     npm run build
     ```
   * If errors occur during the build process, paste the terminal output into your AI chat window to auto-fix missing imports, type mismatches, or syntax issues.

---

### Step 6: Deploy Your Site

1. **Push Changes to GitHub**
   ```bash
   git add .
   git commit -m "Build site using AI IDE workflow"
   git push origin main
   ```
2. **Deploy to Hosting Platform**
   * Connect your GitHub repository to **Vercel**, **Netlify**, or **Cloudflare Pages** for automated builds and continuous deployment on push.
