# AI Task & Performance Planner

<div align="center">
  <img src="https://via.placeholder.com/800x400?text=Hero+Screenshot:+Dashboard" alt="AI Task Planner Dashboard" width="100%" />
</div>

<p align="center">
  <strong>A local-first, privacy-focused desktop productivity environment that bridges structured task tracking with personalized AI scheduling and performance coaching.</strong>
</p>

## 🌟 Why AI Task Planner?

Most task managers either overwhelm you with features or leave you to figure out what to do next. The **AI Task & Performance Planner** acts as your personal productivity coach. It takes your backlog, evaluates your available time and historical estimation accuracy, and builds a realistic daily schedule that you actually have a chance of completing.

### 🛡️ Privacy & Security First (Local-First Architecture)
Your data belongs to you.
- **100% Offline Capable**: Your tasks, rich notes, and time logs are stored locally on your machine using an embedded SQLite database. The core app works flawlessly without an internet connection.
- **Secure API Key Storage**: The application connects to the DeepSeek AI API for intelligent planning and analysis. Your API key is encrypted using your native OS keychain (Windows DPAPI, macOS Keychain, Linux Secret Service) and is never written to disk in plain text.
- **No Cloud Tracking**: We don't have servers. We don't sync your data. What happens on your machine, stays on your machine.

---

## ✨ Features

### 📅 Morning Standup (AI Planning)
Tell the AI how many hours you have to focus today and what your primary goal is. The AI will evaluate your backlog, respect your fixed recurring commitments, and propose a balanced schedule. You always retain total control to review, adjust, and approve the plan before starting your day.

<div align="center">
  <img src="https://via.placeholder.com/600x300?text=Screenshot:+Morning+AI+Planning" alt="Morning AI Planning" />
</div>

### ⏱️ Precision Time Tracking
Track the exact time spent on tasks without worrying about browser tabs or drifting timers. The background-safe timer pauses automatically when you switch tasks and recovers seamlessly even if you close the app.

<div align="center">
  <img src="https://via.placeholder.com/600x300?text=Screenshot:+Active+Timer+and+Task+Board" alt="Precision Timer" />
</div>

### 📊 Performance Coaching & Reports
Are you constantly underestimating how long tasks take? The AI Performance Review analyzes your completed tasks, calculates the variance between your estimates and actual time, and delivers structured advice to improve your future planning.

<div align="center">
  <img src="https://via.placeholder.com/600x300?text=Screenshot:+Performance+Report+Dashboard" alt="Performance Reports" />
</div>

### 🔁 Smart Recurring Tasks
Define rules for your habits (e.g., "Read for 30 mins every day at 8 PM"). The daily instantiation engine automatically populates your "Today" view with your habits, treating fixed-time tasks as non-negotiable blocks during AI scheduling.

<div align="center">
  <img src="https://via.placeholder.com/600x300?text=Screenshot:+Recurring+Rules+Settings" alt="Recurring Rules" />
</div>

### 📝 Rich Markdown Notes
Jot down ideas, format checklists, or paste code blocks with a fully integrated TipTap-powered Markdown editor directly inside your task cards.

---

## 🚀 Installation (End Users)

The easiest way to get started is to download the pre-packaged installer for your operating system.

1. Go to the [Releases](../../releases) page.
2. Download the installer for your OS:
   - **Windows**: `.exe` or `.msi`
   - **macOS**: `.dmg`
   - **Linux**: `.AppImage` or `.deb`
3. Install the application and launch it.
4. Go to **Settings** and securely add your DeepSeek API key to enable AI features.

---

## 🛠️ Build from Source (Advanced / Developers)

If you prefer to build the app from source or want to contribute to development, follow these steps:

### Prerequisites
- Node.js (v18 or higher)
- npm

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/ai-task-planner.git
cd ai-task-planner

# Install dependencies
npm install

# Start the app in development mode
npm run start
```

### Build Executables
To create standalone installers for your local machine:
```bash
npm run package
```
The output files will be located in the `dist/` directory. For more technical details on the architecture, refer to our [Architecture Overview](./ARCHITECTURE.md).

---

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.
